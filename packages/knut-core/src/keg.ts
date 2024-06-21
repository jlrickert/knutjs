import { pipe } from 'effect';
import { optionalT } from './internal/optionalT.js';
import { KegConfig } from './KegConfig.js';
import { Dex } from './Dex.js';
import { KegStorage } from './kegStorage.js';
import { KegNode, NodeOptions } from './KegNode.js';
import { collectAsync, stringify } from './utils.js';
import { TBackend, detectBackend } from './Backend.js';
import { Future, Optional } from './internal/index.js';
import { KegPluginLoader, PluginRecord } from './KegPluginLoader.js';

const T = optionalT(Future.Monad);

export class Keg {
	static async fromBackend(opts: {
		uri: string;
		backend?: TBackend;
		plugins?: PluginRecord;
		/**
		 * create missing config or dex instead of failing
		 */
		createIfMissing?: boolean;
	}): Future.Future<Optional.TOptional<Keg>> {
		const {
			uri,
			backend = await detectBackend(),
			plugins = {},
			createIfMissing = true,
		} = opts;
		if (Optional.isNone(backend)) {
			return Optional.none;
		}
		const storage = await backend.loader(uri);
		if (
			Optional.isNone(storage) ||
			!(await KegStorage.kegExists(storage))
		) {
			return Optional.none;
		}
		const config = await pipe(
			KegConfig.fromStorage(storage),
			T.alt(async () => {
				if (createIfMissing) {
					return T.none;
				}
				const config = KegConfig.default();
				config.toStorage(storage);
				return config;
			}),
		);
		const dex = await pipe(
			Dex.fromStorage(storage),
			T.alt(async () => {
				if (!createIfMissing) {
					return T.none;
				}
				const dex = new Dex();
				await dex.toStorage(storage);
				return dex;
			}),
		);

		if (Optional.isNone(dex) || Optional.isNone(config)) {
			return Optional.none;
		}
		const keg = new Keg({
			uri,
			backend,
			storage: KegStorage.fromStorage(storage),
			config,
			dex,
			plugins,
		});
		await keg.init();
		return keg;
	}

	/**
	 * Create a new keg if it doesn't exist
	 */
	static createNew = async (args: {
		uri: string;
		backend: TBackend;
		config?: KegConfig;
		plugins?: PluginRecord;
	}): Future.Future<Optional.TOptional<Keg>> => {
		const {
			uri,
			backend,
			config = KegConfig.default(),
			plugins = {},
		} = args;
		const storage = await backend.loader(uri);
		if (Optional.isNone(storage) || (await KegStorage.kegExists(storage))) {
			return Optional.none;
		}
		await config.toStorage(storage);
		const dex = new Dex();
		const keg = new Keg({
			uri,
			backend,
			storage: KegStorage.fromStorage(storage),
			plugins,
			dex,
			config,
		});

		await keg.pluginLoader.newKeg(keg, async () => {
			await pipe(
				keg.createNode(),
				T.chain(async (nodeId) => {
					const node = await KegNode.zeroNode();
					await node.toStorage(storage);
					return nodeId;
				}),
			);
			await keg.update();
			await keg.init();
		});

		return keg;
	};

	public readonly uri: string;
	public readonly backend: TBackend;
	public readonly storage: KegStorage;
	public readonly config: KegConfig;
	public readonly dex: Dex;
	private readonly pluginLoader: KegPluginLoader;
	private constructor(args: {
		uri: string;
		backend: TBackend;
		storage: KegStorage;
		config: KegConfig;
		dex: Dex;
		plugins: PluginRecord;
	}) {
		this.backend = args.backend;
		this.config = args.config;
		this.dex = args.dex;
		this.pluginLoader = KegPluginLoader.fromRecord(args.plugins);
	}

	/**
	 * Reloads the configuration
	 *
	 * @param config
	 */
	async reloadConfig(config: KegConfig) {
		await this.pluginLoader.reloadConfig(async () => {
			this.config.mergeData(config);
		});
	}

	private init = async (f?: () => Future.Future<void>) => {
		const next = f ? f : async () => { };
		this.pluginLoader.init(this, next);
	};

	async last(): Future.Future<Optional.TOptional<NodeId>> {
		const list = await collectAsync(this.storage.listNodes());
		list.sort((a, b) => (a.lt(b) ? 1 : -1));
		return list.length > 0 ? T.some(list[0]) : T.none;
	}

	async createNode(): Future.Future<Optional.TOptional<NodeId>> {
		const nodeId = await pipe(
			this.last(),
			T.map((a) => a.next()),
			T.alt(() => Future.of(new NodeId(0))),
			T.chain(async (nodeId) => {
				const node = await KegNode.fromContent({ content: '' });
				await this.writeNode(nodeId, node);
				return nodeId;
			}),
		);
		if (Optional.isNone(nodeId)) {
			return Optional.none;
		}
		let called = false;
		const next = () => {
			const node = this.dex.addNode(nodeId);
			this.storage.write();
			called = true;
		};
		await this.pluginLoader.createNode(nodeId, next);

		return nodeId;
	}

	async getNode(nodeId: NodeId): Future.Future<Optional.TOptional<KegNode>> {
		const node = this.pluginLoader.readNode(nodeId);
		return await KegNode.fromStorage(nodeId, this.storage);
	}

	async writeNode(nodeId: NodeId, node: KegNode): Future.Future<boolean> {
		this.dex.addNode(nodeId, node);
		await this.dex.toStorage(this.storage);
		return await node.toStorage(nodeId, this.storage);
	}

	async writeNodeContent(
		nodeId: NodeId,
		{ content, updated, meta }: Partial<NodeOptions>,
	): Future.Future<boolean> {
		const node = await this.getNode(nodeId);
		if (Optional.isNone(node)) {
			return false;
		}

		if (Optional.isSome(content)) {
			await node.updateContent(content);
		}
		if (Optional.isSome(meta)) {
			node.meta.data = { ...node.meta.data, ...meta };
		}
		if (Optional.isSome(updated)) {
			node.updated = updated;
		}
		return this.writeNode(nodeId, node);
	}

	async deleteNode(nodeId: NodeId): Future.Future<boolean> {
		return this.storage.rm(stringify(nodeId));
	}

	async *getNodeList(): AsyncGenerator<
		readonly [NodeId, KegNode],
		void,
		unknown
	> {
		for (const entry of this.dex.entries) {
			const node = await this.getNode(entry.nodeId);
			if (node) {
				yield [entry.nodeId, node] as const;
			}
		}
	}

	async update(): Future.Future<void> {
		this.config.data.updated = new Date();
		await this.rebuildDex();
		await this.config.toStorage(this.storage);
		for (const plugin of this.services.pluginList) {
			await plugin.update();
		}
	}

	/**
	 * Rebuilds the dex and saves it
	 */
	private async rebuildDex(): Future.Future<void> {
		this.dex.clear();
		for await (const nodeId of this.storage.listNodes()) {
			const node = await this.getNode(nodeId);
			if (Optional.isNone(node)) {
				continue;
			}
			this.dex.addNode(nodeId, node);
		}
		await this.dex.toStorage(this.storage);
	}
}
