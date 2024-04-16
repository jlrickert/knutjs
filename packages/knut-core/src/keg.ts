import { pipe } from 'fp-ts/lib/function.js';
import { Optional, optional } from './internal/optional.js';
import { Future, future } from './internal/future.js';
import { optionalT } from './internal/optionalT.js';
import { GenericStorage } from './storage/storage.js';
import { KegFile } from './kegFile.js';
import { Dex } from './dex.js';
import { KegStorage } from './kegStorage.js';
import { KegNode, NodeId, NodeOptions } from './node.js';
import { collectAsync, stringify } from './utils.js';
import { detectBackend } from './backend.js';
import { KegPlugin } from './kegPlugin/kegPlugin.js';
import { DateKegPlugin } from './kegPlugin/datePugin.js';

const T = optionalT(future.Monad);

export type CreateNodeOptions = {
	content: string;
	tags?: string;
};

export type Subscription = {
	unsub: () => void;
};

export type KegEventMap = {
	addPlugin: {};
	update: {};
	createNode: { nodeId: NodeId };
	readNode: { nodeId: NodeId };
	updateNode: { nodeId: NodeId; node: KegNode };
	removeNode: { nodeId: NodeId };
};

export type KegEventHandler<E extends keyof KegEventMap> = (
	data: KegEventMap[E],
) => Future<void>;

export class Keg {
	static async fromUri(uri: string): Future<Optional<Keg>> {
		const platform = await detectBackend();
		if (optional.isNone(platform)) {
			return optional.none;
		}
		const storage = await platform.loader(uri);
		if (optional.isNone(storage)) {
			return optional.none;
		}
		const keg = await Keg.fromStorage(storage);
		return keg;
	}

	static async fromStorage(storage: GenericStorage): Future<Optional<Keg>> {
		const kegFile = await KegFile.fromStorage(storage);
		const dex = await Dex.fromStorage(storage);
		if (!kegFile || !dex) {
			return optional.none;
		}
		const keg = new Keg(kegFile, dex, KegStorage.fromStorage(storage));
		await keg.init();
		return keg;
	}

	/**
	 * Create a new keg if it doesn't exist
	 **/
	static async init(storage: GenericStorage): Future<Optional<Keg>> {
		if (await KegStorage.kegExists(storage)) {
			return optional.none;
		}
		const kegFile = KegFile.default();
		await kegFile.toStorage(storage);

		const dex = new Dex();
		const keg = new Keg(kegFile, dex, KegStorage.fromStorage(storage));
		await keg.init();
		await pipe(
			keg.createNode(),
			T.chain(async (nodeId) => {
				const node = await KegNode.zeroNode();
				await node.toStorage(nodeId, keg.storage);
				return nodeId;
			}),
		);
		await keg.update();
		return keg;
	}

	private constructor(
		public readonly kegFile: KegFile,
		public readonly dex: Dex,
		public readonly storage: KegStorage,
	) {}

	private async init() {
		this.on('update', async () => {
			this.dex.clear();
			for await (const nodeId of this.storage.listNodes()) {
				const node = await this.getNode(nodeId);
				if (optional.isNone(node)) {
					continue;
				}
				this.dex.addNode(nodeId, node);
			}
			await this.dex.toStorage(this.storage);
		});

		const addNodeToDex = async (nodeId: NodeId) => {
			const node = await this.getNode(nodeId);
			if (optional.isNone(node)) {
				this.dex.removeNode(nodeId);
				return;
			}
			this.dex.addNode(nodeId, node);
			await this.dex.toStorage(this.storage);
		};
		this.on('createNode', async ({ nodeId }) => addNodeToDex(nodeId));
		this.on('updateNode', async ({ nodeId }) => addNodeToDex(nodeId));
		this.on('removeNode', async ({ nodeId }) =>
			this.dex.removeNode(nodeId),
		);

		for (const plugin of Keg.pluginList) {
			await plugin.init(this);
		}
	}

	public static pluginList: KegPlugin[] = [];
	static addPlugin(plugin: KegPlugin) {
		Keg.pluginList.push(plugin);
	}

	private listenerMap: {
		[E in keyof KegEventMap]: KegEventHandler<E>[];
	} = {
		update: [],
		addPlugin: [],
		createNode: [],
		readNode: [],
		updateNode: [],
		removeNode: [],
	};

	on<E extends keyof KegEventMap>(
		event: E,
		f: (data: KegEventMap[E]) => Future<void>,
	) {
		const list = this.listenerMap[event];
		list.push(f);
		return {
			unsub: () => {
				const index = list.findIndex((a) => a === f);
				if (index < 0) {
					throw new Error(
						'Programmer error: unsub from an alread unsubscribed object',
					);
				}
				delete list[index];
			},
		};
	}

	private async emit<E extends keyof KegEventMap>(
		event: E,
		data: KegEventMap[E],
	): Future<void> {
		for (const f of this.listenerMap[event]) {
			await f(data);
		}
	}

	async last(): Future<Optional<NodeId>> {
		const nodeList = await collectAsync(this.storage.listNodes());
		nodeList.sort((a, b) => (a.lt(b) ? 1 : -1));
		const nodeId =
			nodeList.length > 0 ? optional.some(nodeList[0]) : optional.none;
		return nodeId;
	}

	async createNode(): Future<Optional<NodeId>> {
		const nodeId = await pipe(
			this.last(),
			T.map((a) => a.next()),
			T.alt(() => future.of(new NodeId(0))),
			T.chain(async (nodeId) => {
				const node = await KegNode.fromContent({ content: '' });
				await this.writeNode(nodeId, node);
				return nodeId;
			}),
		);
		if (optional.isSome(nodeId)) {
			await this.emit('createNode', { nodeId });
		}

		return nodeId;
	}

	async getNode(nodeId: NodeId): Future<Optional<KegNode>> {
		const node = await KegNode.fromStorage(nodeId, this.storage);
		await this.emit('readNode', { nodeId });
		return node;
	}

	async writeNode(nodeId: NodeId, node: KegNode): Future<boolean> {
		const ok = await node.toStorage(nodeId, this.storage);
		await this.emit('updateNode', { nodeId, node });
		return ok;
	}

	async writeNodeContent(
		nodeId: NodeId,
		{ content, updated, meta }: Partial<NodeOptions>,
	): Future<boolean> {
		const node = await this.getNode(nodeId);
		if (optional.isNone(node)) {
			return false;
		}

		if (optional.isSome(content)) {
			await node.updateContent(content);
		}
		if (optional.isSome(meta)) {
			node.updateMeta(meta);
		}
		if (optional.isSome(updated)) {
			node.updated = updated;
		}
		const ok = await this.writeNode(nodeId, node);
		return ok;
	}

	async deleteNode(nodeId: NodeId): Future<boolean> {
		const ok = this.storage.rm(stringify(nodeId));
		await this.emit('removeNode', { nodeId });
		return ok;
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

	async update(): Future<void> {
		await this.emit('update', {});
		this.kegFile.data.updated = stringify(new Date());
		await this.kegFile.toStorage(this.storage);
	}
}

Keg.addPlugin(DateKegPlugin);
