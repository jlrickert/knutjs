import * as FPMap from 'fp-ts/lib/Map.js';
import * as FPString from 'fp-ts/lib/string.js';
import { pipe } from 'fp-ts/lib/function.js';
import { Dex } from './dex.js';
import { EnvStorage } from './envStorage.js';
import { KegFile } from './kegFile.js';
import { KegStorage, loadKegStorage } from './kegStorage.js';
import { KegNode, NodeId } from './node.js';
import { collectAsync, stringify } from './utils.js';
import { MemoryStorage } from './storage/memoryStorage.js';
import { KegPlugin, KegPluginContext } from './internal/plugins/kegPlugin.js';
import { GenericStorage } from './storage/storage.js';
import { IndexPlugin } from './internal/plugins/indexPlugin.js';
import {
	SearchParams,
	SearchPlugin,
	SearchResult,
} from './internal/plugins/searchPlugin.js';
import { NodesPlugin } from './plugins/nodesPlugin.js';
import { NodeContent } from './nodeContent.js';
import { MetaFile } from './metaFile.js';
import { array, option, ord, task } from 'fp-ts';
import { ChangesPlugin } from './plugins/changesPlugin.js';
import { FuseKegPlugin } from './plugins/fusePlugin.js';

type PluginState = {
	ctx: KegPluginContext;
	plugin: KegPlugin;
	active: boolean;
	indexes: Map<string, IndexPlugin>;
	searches: Map<string, SearchPlugin>;
	activate(): Promise<void>;
	deactivate(): Promise<void>;
};

export type CreateNodeOptions = {
	content: string;
	tags?: string;
};

export class Keg {
	static async voidKeg(): Promise<Keg> {
		const keg = new Keg(
			KegFile.create(),
			Dex.create(),
			KegStorage.fromStorage(MemoryStorage.create()),
			EnvStorage.createInMemory(),
		);
		await keg.addPlugin(new NodesPlugin());
		await keg.addPlugin(new ChangesPlugin());
		await keg.addPlugin(new FuseKegPlugin());
		return keg;
	}

	static async fromStorage(
		storage: string | GenericStorage | KegStorage,
		env: EnvStorage,
	): Promise<Keg | null> {
		let store: KegStorage;
		if (typeof storage === 'string') {
			store = loadKegStorage(storage);
		} else if (storage instanceof KegStorage) {
			store = storage;
		} else {
			store = KegStorage.fromStorage(storage);
		}

		const kegFile = await KegFile.fromStorage(store);
		const dex = Dex.create();
		if (!kegFile) {
			return null;
		}
		const keg = new Keg(kegFile, dex, store, env);
		await keg.addPlugin(new NodesPlugin());
		await keg.addPlugin(new ChangesPlugin());
		await keg.addPlugin(new FuseKegPlugin());
		return keg;
	}

	static async create(
		storage: string | GenericStorage | KegStorage,
		env: EnvStorage,
	) {
		let store: KegStorage;
		if (typeof storage === 'string') {
			store = loadKegStorage(storage);
		} else if (storage instanceof KegStorage) {
			store = storage;
		} else {
			store = KegStorage.fromStorage(storage);
		}

		const kegFile = KegFile.create();
		const dex = Dex.create();
		if (!kegFile) {
			return null;
		}
		const keg = new Keg(kegFile, dex, store, env);
		await keg.addPlugin(new NodesPlugin());
		await keg.addPlugin(new ChangesPlugin());
		await keg.addPlugin(new FuseKegPlugin());
		const zeroNode = await KegNode.zeroNode();
		await keg.setNode(new NodeId(0), zeroNode);
		return keg;
	}

	private constructor(
		public readonly kegFile: KegFile,
		public readonly dex: Dex,
		public readonly storage: KegStorage,
		private readonly env: EnvStorage,
	) {}

	/**
	 * config is the config storage
	 **/
	get config() {
		return this.env.config;
	}

	/**
	 * var is the variable storage
	 **/
	get var() {
		return this.env.variable;
	}

	/**
	 * cache is the cache storage
	 **/
	get cache() {
		return this.env.config;
	}

	async last(): Promise<NodeId | null> {
		const nodeList = await collectAsync(this.storage.listNodes());
		nodeList.sort((a, b) => (a.lt(b) ? 1 : -1));
		const nodeId = nodeList.length > 0 ? nodeList[0] : null;
		return nodeId;
	}

	async getNode(nodeId: NodeId): Promise<KegNode | null> {
		const node = await KegNode.fromStorage(nodeId, this.storage);
		return node;
	}

	async createNode(): Promise<NodeId> {
		const nodeId = pipe(
			await this.last(),
			(a) => a?.next() ?? new NodeId(0),
		);
		const node = await KegNode.create();
		await this.setNode(nodeId, node);
		return nodeId;
	}

	async setNode(nodeId: NodeId, node: KegNode): Promise<void> {
		const filepath = NodeContent.filePath(nodeId);
		const metapath = MetaFile.filePath(nodeId);
		await this.storage.write(filepath, node.content);
		await this.storage.write(metapath, stringify(node.meta));
		this.dex.addNode(nodeId, node);
	}

	/**
	 * Iterate over the nodes using the dex
	 **/
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

	async update(name?: string | string[]): Promise<void> {
		const run = pipe(
			option.fromNullable(name ?? null),
			option.map((a) => (typeof a === 'string' ? [a] : a)),
			option.getOrElse(() => {
				return pipe(
					this.indexPlugins,
					FPMap.collect(FPString.Ord)((name) => name),
				);
			}),
			array.filterMap((name) =>
				pipe(FPMap.lookup(FPString.Eq)(name, this.indexPlugins)),
			),
			array.sort(
				ord.fromCompare<IndexPlugin>((a, b) => {
					if (a.depends?.includes(b.name) ?? false) {
						return -1;
					}
					if (b.depends?.includes(a.name) ?? false) {
						return 1;
					}
					return 0;
				}),
			),
			task.traverseArray((a) => a.update),
		);
		await run();
		this.kegFile.updated = new Date();
		this.storage.write(KegFile.filePath(), stringify(this.kegFile));
	}

	async search(
		args: { name?: string } & SearchParams,
	): Promise<SearchResult[]> {
		const name = args.name ?? this.kegFile.data.defaultSearch ?? null;
		if (name === null) {
			return [];
		}
		const plugin = this.searchPlugin.get(name) ?? null;
		if (plugin === null) {
			return [];
		}
		const { limit, filter } = args;
		const results = await plugin.search({ limit, filter });
		return results;
	}

	private plugins = new Map<string, PluginState>();
	private indexPlugins = new Map<string, IndexPlugin>();
	private searchPlugin = new Map<string, SearchPlugin>();
	async addPlugin(plugin: KegPlugin): Promise<void> {
		// Indexes related to the plugin
		const indexes = new Map<string, IndexPlugin>();

		// Search functions related to the plugin
		const searches = new Map<string, SearchPlugin>();
		const keg = this;
		let active = false;

		const ctx: KegPluginContext = {
			keg,
			// Plugin creator needs to be able to get a list of all available indexes
			async getIndexList() {
				return pipe(keg.indexPlugins, FPMap.keys(FPString.Ord));
			},

			// Allow the plugin creator to register an index
			async registerIndex(plug) {
				keg.indexPlugins.set(plugin.name, plug);
				indexes.set(plug.name, plug);
			},

			async degregisterIndex(name) {
				keg.indexPlugins.delete(name);
				indexes.delete(name);
			},

			// Plugin creator needs to be able to get a list of all available searches
			async getSearchList() {
				return pipe(keg.searchPlugin, FPMap.keys(FPString.Ord));
			},

			async registerSearch(plug) {
				keg.searchPlugin.set(plugin.name, plug);
				searches.set(plug.name, plug);
			},

			async degregisterSearch(name) {
				keg.searchPlugin.delete(name);
				searches.delete(name);
			},
		};

		const state = {
			ctx,
			searches,
			indexes,
			plugin,
			active,
			async activate() {
				await plugin.activate(ctx);
				if (active) {
					return;
				}
				for (const [name, plug] of indexes) {
					keg.indexPlugins.set(name, plug);
				}
				for (const [name, plug] of searches) {
					keg.searchPlugin.set(name, plug);
				}
				this.active = true;
			},
			async deactivate() {
				if (!active) {
					return;
				}
				for (const [name] of indexes) {
					keg.indexPlugins.delete(name);
				}
				for (const [name] of searches) {
					keg.searchPlugin.delete(name);
				}
				if (plugin.deactivate) {
					await plugin.deactivate(ctx);
				}
				this.active = false;
			},
		};

		this.plugins.set(plugin.name, state);
		await state.activate();
	}

	async removePlugin(name: string): Promise<void> {
		const state = this.plugins.get(name);
		if (!state) {
			return;
		}
		await state.deactivate();
		this.plugins.delete(name);
	}
}
