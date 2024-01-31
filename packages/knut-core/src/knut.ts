import Fuse, { FuseOptionKey, FuseSearchOptions } from 'fuse.js';
import { ConfigDefinition, KnutConfigFile } from './configFile.js';
import { buildFilterFn } from './filterTypes.js';
import { MetaFile, MetaData } from './metaFile.js';
import { KegNode, NodeId } from './node.js';
import { JSON, stringify } from './utils.js';
import { Keg } from './keg.js';
import { KegStorage, loadKegStorage } from './kegStorage.js';
import { EnvStorage } from './envStorage.js';
import { KnutPlugin, PluginCreator } from './plugins/plugin.js';
import nodesPlugin from './plugins/nodes.plugin.js';
import changesPlugin from './plugins/changes.plugin.js';
import classicPlugin from './plugins/classic.plugin.js';
import tagsPlugin from './plugins/tags.plugin.js';
import dailyPlugin from './plugins/daily.plugin.js';
import { SearchOptions, SearchPluginCreator, SearchResult } from './plugins/searchPlugin.js';
import { IndexPluginCreator, } from './plugins/indexPlugin.js';

export type KnutOptions = {
	/**
	 * Storage or a filesystem path to the keg if a file system is present
	 */
	env: EnvStorage;
	plugins: PluginCreator[];
};

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

export type ShareOptions = {
	kegalias: string;
	nodeId: NodeId;
};

type PublishOptions = {
	target: 'git' | 'mkdocs' | 'knut';
};

export type SearchStrategy = 'classic' | 'semantic';

/**
 * Knut Provides a high level api for managing a keg
 **/
export class Knut {
	private kegMap = new Map<string, Keg>();

	static async fromEnvironment(env: EnvStorage): Promise<Knut> {
		const dataConfig =
			(await KnutConfigFile.fromStorage(env.variable)) ??
			KnutConfigFile.create();
		for (const keg of dataConfig.data.kegs) {
			keg.url = await env.variable.resolve(keg.url);
		}

		const userConfig =
			(await KnutConfigFile.fromStorage(env.config)) ??
			KnutConfigFile.create();

		for (const keg of userConfig.data.kegs) {
			keg.url = await env.config.resolve(keg.url);
		}

		const configFile = dataConfig.concat(userConfig);
		const knut = await Knut.fromConfig(configFile.data, {
			env: env,
			plugins: [],
		});
		return knut;
	}

	static async fromConfig(
		config: ConfigDefinition,
		options?: KnutOptions,
	): Promise<Knut> {
		const knut = new Knut(options?.env ?? EnvStorage.createInMemory());
		await knut.addPlugin(await nodesPlugin);
		await knut.addPlugin(await changesPlugin);
		await knut.addPlugin(await tagsPlugin);
		await knut.addPlugin(await classicPlugin);
		await knut.addPlugin(await dailyPlugin);
		await knut.init(config);
		return knut;
	}

	static async create() {
		const storage = await EnvStorage.create();
		const knut = Knut.fromEnvironment(storage);
		return knut;
	}

	private plugins = new Map<string, KnutPlugin>();
	private constructor(readonly env: EnvStorage) {}

	private *getIndexPluginList(kegalias: string) {
		for (const [name, plugin] of this.plugins) {
			for (const creator of plugin.indexList) {
				const fn: IndexPluginCreator = ({keg}) => {
					return creator({keg, knut: this, storage: this.env.child(`plugins/${plugin.name}`)})
				}
				yield fn
			}
		}
	}

	private *getSearchPluginList(kegalias: string) {
		for (const [name, plugin] of this.plugins) {
			for (const creator of plugin.searchList) {
				const fn: SearchPluginCreator = async ({ keg }) => {
					return creator({
						keg,
						kegalias,
						storage: this.env.child(`plugins/${plugin.name}`),
					});
				};
				yield fn;
			}
		}
	}

	/**
	 * Loads required data for a keg
	 */
	async loadKeg(kegalias: string, storage: KegStorage): Promise<void> {
		const keg = await Keg.fromStorage(storage, {
			indexList: [...this.getIndexPluginList(kegalias)],
			searchList: [...this.getSearchPluginList(kegalias)],
		});
		if (!keg) {
			return;
		}
		for (const creator of this.getIndexPluginList(kegalias)) {
			await keg.addIndex(creator);
		}
		for (const creator of this.getSearchPluginList(kegalias)) {
			await keg.addSearch(creator);
		}
		this.kegMap.set(kegalias, keg);
	}

	private async addPlugin(creator: PluginCreator) {
		const plugin = await creator(this);
		this.plugins.set(plugin.name, plugin);
	}

	private async init(config: ConfigDefinition) {
		this.kegMap.clear();
		for (const keg of config.kegs) {
			const storage = loadKegStorage(keg.url);
			await this.loadKeg(keg.alias, storage);
		}
	}

	async update(): Promise<boolean> {
		for (const [kegalias, keg] of this.kegMap) {
			await keg.update()
		}
		const keg = this.getKeg(kegalias);
		if (!keg) {
			return false;
		}
		await keg.update();
		for (const [name, plugin] of this.plugins) {
			for (const indexUpdater of plugin.indexList) {
				const { reload } = await  indexUpdater({keg})
			}
		}
		return true;
	}

	getKeg(kegalias: string): Keg | null {
		return this.kegMap.get(kegalias) ?? null;
	}

	async *getKegList() {
		for (const [kegalias, keg] of this.kegMap) {
			yield [kegalias, keg] as const;
		}
	}

	async *getNodeList() {
		for (const [kegalias, keg] of this.kegMap) {
			for await (const [nodeId, node] of keg.getNodeList()) {
				yield [kegalias, nodeId, node] as const;
			}
		}
	}

	// async nodeCreate(options: NodeCreateOptions): Promise<KegNode | null> {
	// 	const keg = this.kegMap.get(options.kegalias);
	// 	if (!keg) {
	// 		return null;
	// 	}
	// 	const updated = now('Y-m-D H:M');
	// 	keg.update((data) => {
	// 		data.updated = updated;
	// 	});
	//
	// 	const nodeId = keg.getNodeId();
	// 	const node = await KegNode.fromContent({
	// 		content: options.content,
	// 		updated,
	// 	});
	// 	keg.dex.addNode(nodeId, node);
	// 	return node;
	// }

	async getNode(options: NodeReadOptions): Promise<KegNode | null> {
		const keg = this.kegMap.get(options.kegalias);
		if (!keg) {
			return null;
		}
		const node = await keg.getNode(options.nodeId);
		return node;
	}

	// async createNode({
	// 	kegalias,
	// 	content,
	// 	meta,
	// }: NodeUpdateOptions): Promise<KegNodeRef | null> {
	// 	const keg = this.kegMap.get(kegalias);
	// 	if (!keg) {
	// 		return null;
	// 	}
	// 	const node = await keg.createNode({ content: content ?? '' });
	// 	return node;
	// }

	async search(
		model: string,
		{ limit, filter }: SearchOptions,
	): Promise<SearchResult[]> {
		const search =
		const results: SearchResult[] = [];
		for await (const [kegalias, keg] of this.getKegList()) {
			const kegaliasFilter = filter?.kegalias
			const filterFn = kegaliasFilter ? buildFilterFn(kegaliasFilter) : null
			if (filter?.kegalias && buildFilterFn(filter.kegalias)(kegalias)) {
				const x = keg.search()
				results.push
			}
			buildFilterFn(filter?.kegalias)(kegalias)
			if (filter?.kegalias)
		}
		type Data = {
			nodeId: string;
			kegalias: string;
			content: string;
			title: string;
			author: string | null;
			tags: string[];
			updated: string;
			meta: JSON;
		};
		const data: Data[] = [];

		for await (const [kegalias, keg] of this.getKegList()) {
			const author = keg.kegFile.getAuthor();
			for await (const [nodeId, node] of keg.getNodeList()) {
				const content = stringify(node.content);
				data.push({
					content,
					kegalias,
					nodeId: stringify(nodeId),
					title: node.title,
					author,
					tags: [...node.getTags()],
					updated: node.updated,
					meta: node.meta.export() ?? null,
				});
			}
		}
		const search = filter?.$text?.$search ?? '';
		if ((filter && Object.keys(filter).length === 0) || search === '') {
			const results: KnutSearchResult[] = [];
			for (let i = 0; i < data.length; i++) {
				const item = data[i];
				results.push({
					author: item.author,
					meta: item.meta,
					title: item.title,
					tags: item.tags,
					nodeId: item.nodeId,
					updated: item.updated,
					rank: 1,
					kegalias: item.kegalias,
				});
			}
			return results;
		}
		const keys: FuseOptionKey<Data>[] = [
			{ name: 'title', weight: 2 },
			'content',
		];
		const indexData = Fuse.createIndex(keys, data);
		const index = Fuse.parseIndex<Data>(indexData);
		const fuse = new Fuse(
			data,
			{
				keys,
				includeScore: true,
				isCaseSensitive: false,
				findAllMatches: true,
			},
			index,
		);

		const fuseOptions: FuseSearchOptions | undefined =
			!limit || limit <= 0 ? undefined : { limit };
		const fuseResult = fuse.search(search, fuseOptions);

		for (const result of fuseResult) {
			results.push({
				kegalias: result.item.kegalias,
				nodeId: result.item.nodeId,
				title: result.item.title,
				rank: result.score ?? 0,
				updated: result.item.updated,
				author: result.item.author,
				tags: result.item.tags,
				meta: result.item.meta,
			});
		}
		return results;
	}

	/**
	 * Export keg to an external source. This could be with git.
	 */
	async publish(kegpath: string, options?: PublishOptions): Promise<void> {}

	/**
	 * Share a specific shareable node by providing a link.
	 */
	async share({
		kegalias: kegpath,
		nodeId,
	}: ShareOptions): Promise<string | null> {
		const keg = this.kegMap.get(kegpath);
		if (!keg) {
			return null;
		}
		const link = keg.kegFile.getLink(nodeId);
		const node = await KegNode.fromStorage(nodeId, keg.storage);
		return link;
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
