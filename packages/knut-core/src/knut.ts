import { KnutConfigFile } from './configFile.js';
import { Filter } from './filterTypes.js';
import { KegFileData } from './kegFile.js';
import { Meta, MetaData } from './metaFile.js';
import { KegNode, NodeId } from './node.js';
import { KegStorage, loadKegStorage } from './kegStorage/index.js';
import { KnutStorage, loadKnutStorage } from './knutStorage/knutStorage.js';
import { IndexEntry, SearchResult } from './search/index.js';
import { classicSearchPlugin } from './search/classicSearch.js';
import { KnutIndex, KnutPlugin, SearchFn } from './knutPlugin.js';
import { Keg } from './keg.js';

export type KegOptions = {
	autoIndex?: boolean;
	/**
	 * Storage or a filesystem path to the keg if a file system is present
	 */
	storage: KegStorage | string;
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
	meta?: Meta | ((meta: Meta) => void);
};

export type NodeDeleteOptions = {
	kegalias: string;
	nodeId: NodeId;
};

export type KnutSearchOptions = {
	filter?: Filter<IndexEntry>;
	limit?: number;
	strategy?: SearchStrategy;
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
	storage?: KnutStorage;
	plugins?: KnutPlugin[];
};

/**
 * Knut Provides a high level api for managing a keg
 **/
export class Knut {
	private kegMap = new Map<string, Keg>();
	private indexList = new Map<string, KnutIndex>();
	private searchList = new Map<string, SearchFn>();

	static async loadDefaults(): Promise<Knut | null> {
		const storage = await loadKnutStorage();
		if (!storage) {
			return null;
		}
		return Knut.fromStorage(storage);
	}

	static async fromStorage(storage?: KnutStorage): Promise<Knut> {
		const store = storage ?? (await loadKnutStorage());
		const userConfig = await KnutConfigFile.fromUserConfig(store);
		const dataConfig = await KnutConfigFile.fromUserData(store);
		const config = dataConfig.concat(userConfig);
		const knut = new Knut(store, config);
		await knut.loadConfig(config);
		await knut.addPlugin(classicSearchPlugin);
		return knut;
	}

	private constructor(
		private storage: KnutStorage,
		private config: KnutConfigFile,
	) {}

	/**
	 * Loads required data for a keg
	 */
	async loadKeg(kegAlias: string, options: KegOptions): Promise<void> {
		const storage =
			typeof options.storage === 'string'
				? loadKegStorage(options.storage)
				: options.storage;
		const keg = await Keg.fromStorage(storage);
		if (keg) {
			this.kegMap.set(kegAlias, keg);
		}
	}

	async addPlugin(plugin: KnutPlugin) {
		plugin({
			config: this.config,
			storage: this.storage,
			registerIndex: async (name, indexer) => {
				const index = await indexer(this);
				this.indexList.set(name, index);
				if (index.init) {
					await index.init();
				}
			},
			registerSearch: async (name, search) => {
				this.searchList.set(name, search);
			},
			onIndex(f) {},
			onSearch(f) {},
		});
	}

	async updateUserConfig(
		updater: (config: KnutConfigFile) => void,
	): Promise<void> {
		const userConfig = await KnutConfigFile.fromUserConfig(this.storage);
		const dataConfig = await KnutConfigFile.fromUserData(this.storage);

		updater(userConfig);
		this.storage.writeConfig(userConfig.filepath, userConfig);

		const config = dataConfig.concat(userConfig);
		this.loadConfig(config);
	}

	private async loadConfig(config: KnutConfigFile) {
		this.kegMap.clear();
		for (const keg of config.data.kegs) {
			await this.loadKeg(keg.alias, { storage: keg.url });
		}
	}

	async update(): Promise<void> {
		for (const [, { update }] of this.indexList) {
			if (update) {
				await update();
			}
			// for (const [kegalias, keg] of this.repoMap) {
			// 	for await (const { nodeId, node } of keg.getNodeList()) {
			// 		const p = engine.add({
			// 			kegalias,
			// 			nodeId: nodeId.stringify(),
			// 			updated: node?.updated,
			// 			author: keg.kegFile.getAuthor(),
			// 			tags: [...node.getTags()],
			// 			meta: node.meta,
			// 			title: node.title,
			// 			content: node.content.stringify(),
			// 			links: [],
			// 			backlinks: [],
			// 		});
			// 		ps.push(p);
			// 	}
			// }
		}
		// const engine = await ClassicSearchEngine.fromStorage({
		// 	storage: this.storage,
		// });
		// if (!engine) {
		// 	return false;
		// }
		// const ps: Promise<any>[] = [];
		// await Promise.all(ps);
		// await engine.index();
		// return true;
	}

	// async nodeCreate(options: NodeCreateOptions): Promise<KegNode | null> {
	// 	const repo = this.repoMap.get(options.kegalias);
	// 	if (!repo) {
	// 		return null;
	// 	}
	// 	const { keg, dex } = repo;
	// 	const updated = now('Y-m-D H:M');
	// 	repo.keg.update((data) => {
	// 		data.updated = updated;
	// 	});
	//
	// 	const nodeId = keg.getNodeId();
	// 	const node = await KegNode.fromContent({
	// 		content: options.content,
	// 		updated,
	// 	});
	// 	repo.dex.addNode(nodeId, node);
	// 	return node;
	// }

	async nodeRead(options: NodeReadOptions): Promise<KegNode | null> {
		const repo = this.kegMap.get(options.kegalias);
		if (!repo) {
			return null;
		}
		const { storage } = repo;
		const node = await KegNode.load(options.nodeId, storage);
		return node;
	}

	async nodeWrite({
		nodeId,
		kegalias,
		content,
		meta,
	}: NodeUpdateOptions): Promise<void> {
		// const repo = this.kegMap.get(kegalias);
		// if (!repo) {
		// 	return;
		// }
		// const { storage } = repo;
		// const node = await KegNode.load(nodeId, storage);
		// if (!node) {
		// 	return;
		// }
		// if (content) {
		// 	node.updateContent(content);
		// }
		// if (meta) {
		// 	node.updateMeta(meta);
		// }
	}

	async search({
		limit,
		filter,
		strategy,
	}: KnutSearchOptions): Promise<SearchResult[]> {
		const search = this.searchList.get(strategy ?? 'classic');
		if (!search) {
			return [];
		}
		return search({ filter, limit });
		// const engine = await ClassicSearchEngine.fromStorage({
		// 	storage: this.storage,
		// });
		// if (!engine) {
		// 	return [];
		// }
		// const ps: Promise<any>[] = [];
		// for (const [kegalias, repo] of this.repoMap) {
		// 	const { keg, dex } = repo;
		// 	for (const { nodeId } of dex.getEntries()) {
		// 		const node = await this.nodeRead({ nodeId, kegalias });
		// 		if (!node) {
		// 			continue;
		// 		}
		// 		const p = engine.add({
		// 			kegalias,
		// 			nodeId: nodeId.stringify(),
		// 			updated: node?.updated,
		// 			author: keg.getAuthor(),
		// 			tags: [...node.getTags()],
		// 			meta: node.meta,
		// 			title: node.title,
		// 			content: node.content.stringify(),
		// 			links: [],
		// 			backlinks: [],
		// 		});
		// 		ps.push(p);
		// 	}
		// }
		// await Promise.all(ps);
		// await engine.index();
		// return engine.search({ limit, filter });
		// 	const results: SearchResult[] = [];
		// 	type Data = {
		// 		nodeId: string;
		// 		kegalias: string;
		// 		content: string;
		// 		title: string;
		// 		author: string | null;
		// 		tags: string[];
		// 		updated: string;
		// 		meta: JSON;
		// 	};
		// 	const data: Data[] = [];
		// 	for (const [kegalias, repo] of this.repoMap) {
		// 		const { keg, dex } = repo;
		// 		const author = keg.getAuthor();
		// 		const entryList = dex.getEntries();
		// 		for (const entry of entryList) {
		// 			const node = await this.nodeRead({
		// 				kegalias,
		// 				nodeId: entry.nodeId,
		// 			});
		// 			const content = node?.content.stringify() ?? '';
		// 			const tags = node?.getTags() ?? [];
		// 			// Only include if node has the expected tag
		// 			if (Array.isArray(filter?.tags)) {
		// 				if (
		// 					!filter.tags.reduce(
		// 						(acc, tag) => acc && tags.includes(tag),
		// 						true,
		// 					)
		// 				) {
		// 					continue;
		// 				}
		// 			}
		// 			data.push({
		// 				content,
		// 				kegalias,
		// 				nodeId: entry.nodeId.stringify(),
		// 				title: node?.title ?? '',
		// 				author,
		// 				tags: [...tags],
		// 				updated: node?.updated ?? '',
		// 				meta: node?.meta.export() ?? null,
		// 			});
		// 		}
		// 	}
		// 	const search = filter?.$text?.$search ?? '';
		// 	if ((filter && Object.keys(filter).length === 0) || search === '') {
		// 		const results: SearchResult[] = [];
		// 		for (let i = 0; i < data.length; i++) {
		// 			const item = data[i];
		// 			results.push({
		// 				author: item.author,
		// 				meta: item.meta,
		// 				title: item.title,
		// 				tags: item.tags,
		// 				nodeId: item.nodeId,
		// 				updated: item.updated,
		// 				rank: 1,
		// 				kegalias: item.kegalias,
		// 			});
		// 		}
		// 		return results;
		// 	}
		// 	const keys: FuseOptionKey<Data>[] = [
		// 		{ name: 'title', weight: 2 },
		// 		'content',
		// 	];
		// 	const indexData = Fuse.createIndex(keys, data);
		// 	const index = Fuse.parseIndex<Data>(indexData);
		// 	const fuse = new Fuse(
		// 		data,
		// 		{
		// 			keys,
		// 			includeScore: true,
		// 			isCaseSensitive: false,
		// 			findAllMatches: true,
		// 		},
		// 		index,
		// 	);
		//
		// 	const fuseOptions: FuseSearchOptions | undefined =
		// 		!limit || limit <= 0 ? undefined : { limit };
		// 	const fuseResult = fuse.search(search, fuseOptions);
		//
		// 	for (const result of fuseResult) {
		// 		results.push({
		// 			kegalias: result.item.kegalias,
		// 			nodeId: result.item.nodeId,
		// 			title: result.item.title,
		// 			rank: result.score ?? 0,
		// 			updated: result.item.updated,
		// 			author: result.item.author,
		// 			tags: result.item.tags,
		// 			meta: result.item.meta,
		// 		});
		// 	}
		// 	return results;
	}

	async setConfig(
		kegpath: string,
		config: Partial<KegFileData>,
	): Promise<void> {
		const keg = this.kegMap.get(kegpath);
		if (!keg) {
			return;
		}
		keg.kegFile.update((data) => {
			for (const key in config) {
				if (config.hasOwnProperty(key)) {
					const element = (config as any)[key];
					(data as any)[key] = element;
				}
			}
		});
		keg.storage.write('keg', keg.kegFile.toYAML());
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
		// const node = await KegNode.load(nodeId, storage);
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

	async *getKegList() {
		for (const [kegalias, keg] of this.kegMap) {
			yield [kegalias, keg] as const;
		}
	}

	getKeg(kegalias: string): Keg | null {
		const keg = this.kegMap.get(kegalias) ?? null;
		return keg;
	}
}
