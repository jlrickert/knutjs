import * as FPMap from 'fp-ts/lib/Map.js';
import * as FPString from 'fp-ts/lib/string.js';
import { pipe } from 'fp-ts/lib/function.js';
import { ConfigDefinition, KnutConfigFile } from './configFile.js';
import { Filter } from './filterTypes.js';
import { MetaFile, MetaData } from './metaFile.js';
import { NodeId } from './node.js';
import { EnvStorage } from './envStorage.js';
import { Keg } from './keg.js';
import { KegStorage, loadKegStorage } from './kegStorage.js';
import { MemoryStorage } from './storage/memoryStorage.js';
import { IndexPlugin } from './internal/plugins/indexPlugin.js';
import {
	SearchFilterOptions,
	SearchPlugin,
	SearchResult,
} from './internal/plugins/searchPlugin.js';
import {
	KnutPlugin,
	KnutPluginContext,
} from './internal/plugins/knutPlugin.js';
import { FuseKnutPlugin } from './plugins/fusePlugin.js';

export type NodeCreateOptions = {
	kegalias: string;
	content: string;
	meta?: MetaData;
	items?: Buffer[];
};

export type NodeReadOptions = {
	kegalias: string;
	nodeId: NodeId;
};

export type NodeUpdateOptions = {
	kegalias: string;
	nodeId: string;
	content?: string;
	meta?: MetaFile | ((meta: MetaFile) => void);
};

export type NodeDeleteOptions = {
	kegalias: string;
	nodeId: NodeId;
};

export type NodeFilterOptions = {
	title: string;
	kegalias: string;
	content: string;
	tags: string[];
	date: string;
	links: string[];
	backlinks: string[];
	author: string;
	meta: MetaFile;
};

export type SearchOptions = {
	filter?: Filter<SearchFilterOptions>;
	limit?: number;
	name?: string;
};

export type ShareOptions = {
	kegalias: string;
	nodeId: NodeId;
};

type PublishOptions = {
	target: 'git' | 'mkdocs' | 'knut';
};

export type SearchStrategy = 'classic' | 'semantic';

export type KnutOptions = {
	env: EnvStorage;
};

type PluginState = {
	ctx: KnutPluginContext;
	plugin: KnutPlugin;
	active: boolean;
	indexes: Map<string, IndexPlugin>;
	searches: Map<string, SearchPlugin>;
	activate(): Promise<void>;
	deactivate(): Promise<void>;
};

/**
 * Knut Provides a high level api for managing a keg
 **/
export class Knut {
	private kegMap = new Map<string, Keg>();

	static empty(): Knut {
		const storage = MemoryStorage.create();
		return new Knut(
			EnvStorage.fromStorage({
				config: storage.child('config'),
				cache: storage.child('cache'),
				variable: storage.child('variable'),
			}),
		);
	}

	static async create(): Promise<Knut> {
		const env = await EnvStorage.create();
		const knut = await Knut.fromEnvironment(env.child('knut'));
		return knut;
	}

	static async fromEnvironment(env: EnvStorage): Promise<Knut> {
		const configFile = await KnutConfigFile.fromEnvStorage(env, {
			resolve: true,
		});
		const knut = await Knut.fromConfig(configFile.data, { env: env });
		return knut;
	}

	static async fromConfig(
		config: ConfigDefinition,
		options?: KnutOptions,
	): Promise<Knut> {
		const env = options?.env ?? EnvStorage.createInMemory();
		const knut = new Knut(env);
		await knut.init(config);
		knut.addPlugin(new FuseKnutPlugin());
		return knut;
	}

	private constructor(public readonly env: EnvStorage) {}

	/**
	 * Loads required data for a keg
	 */
	async loadKeg(kegalias: string, storage: KegStorage): Promise<void> {
		const keg = await Keg.fromStorage(storage, this.env);
		if (!keg) {
			return;
		}
		this.kegMap.set(kegalias, keg);
	}

	private async init(config: ConfigDefinition) {
		this.kegMap.clear();
		for (const keg of config.kegs) {
			const storage = loadKegStorage(keg.url);
			await this.loadKeg(keg.alias, storage);
		}
	}

	getKeg(kegalias: string): Keg | null {
		return this.kegMap.get(kegalias) ?? null;
	}

	*getKegList() {
		for (const [kegalias, keg] of this.kegMap) {
			yield [kegalias, keg] as const;
		}
	}

	*getEntryList() {
		for (const [kegalias, keg] of this.kegMap) {
			for (const entry of keg.dex.entries) {
				yield [kegalias, entry] as const;
			}
		}
	}

	async *getNodeList() {
		for (const [kegalias, keg] of this.kegMap) {
			for await (const [nodeId, node] of keg.getNodeList()) {
				yield [kegalias, nodeId, node] as const;
			}
		}
	}

	async update(): Promise<void> {
		for (const [, { update }] of this.indexPlugins) {
			await update();
		}
		for (const [, keg] of this.getKegList()) {
			await keg.update();
		}
	}

	async search(options: SearchOptions): Promise<SearchResult[]> {
		const name = options.name ?? 'fuse';
		if (name === null) {
			return [];
		}
		const plugin = this.searchPlugin.get(name) ?? null;
		if (plugin === null) {
			return [];
		}
		const { limit, filter } = options;
		const results = await plugin.search({ limit, filter });
		return results;
	}

	private plugins = new Map<string, PluginState>();
	private indexPlugins = new Map<string, IndexPlugin>();
	private searchPlugin = new Map<string, SearchPlugin>();
	async addPlugin(plugin: KnutPlugin): Promise<void> {
		const indexes = new Map<string, IndexPlugin>();
		const searches = new Map<string, SearchPlugin>();
		const knut = this;
		let active = false;

		const ctx: KnutPluginContext = {
			knut,
			async getIndexList() {
				return pipe(knut.indexPlugins, FPMap.keys(FPString.Ord));
			},
			async registerIndex(plug) {
				knut.indexPlugins.set(plugin.name, plug);
				indexes.set(plug.name, plug);
			},
			async degregisterIndex(name) {
				knut.indexPlugins.delete(name);
				indexes.delete(name);
			},
			async registerSearch(plug) {
				knut.searchPlugin.set(plugin.name, plug);
				searches.set(plug.name, plug);
			},
			async getSearchList() {
				return pipe(knut.searchPlugin, FPMap.keys(FPString.Ord));
			},
			async degregisterSearch(name) {
				knut.searchPlugin.delete(name);
				searches.delete(name);
			},
		};

		const state: PluginState = {
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
					knut.indexPlugins.set(name, plug);
				}
				for (const [name, plug] of searches) {
					knut.searchPlugin.set(name, plug);
				}
				this.active = true;
			},
			async deactivate() {
				if (!active) {
					return;
				}
				for (const [name] of indexes) {
					knut.indexPlugins.delete(name);
				}
				for (const [name] of searches) {
					knut.searchPlugin.delete(name);
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

	/**
	 * Export keg to an external source. This could be with git.
	 */
	async publish(kegpath: string, options?: PublishOptions): Promise<void> {}

	/**
	 * Share a specific shareable node by providing a link.
	 */
	async share({ kegalias, nodeId }: ShareOptions): Promise<string | null> {
		return null;
	}

	/**
	 * Remove access to a node
	 **/
	async unshare(options: ShareOptions): Promise<void> {}

	/**
	 * import nodes from another keg. Used for combining multiple kegs into 1.
	 */
	async merge(from: string | string[], to: string): Promise<void> {}
}
