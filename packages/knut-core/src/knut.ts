import Fuse, { FuseOptionKey, FuseSearchOptions } from 'fuse.js';
import { KnutConfigFile } from './configFile.js';
import { Dex } from './dex.js';
import { Filter } from './filterTypes.js';
import { KegFile, KegFileData } from './kegFile.js';
import { Meta, MetaData } from './metaFile.js';
import { KegNode, NodeId } from './node.js';
import { JSON, now } from './utils.js';
import { KegStorage, loadKegStorage } from './kegStorage/index.js';
import { KnutStorage, loadKnutStorage } from './knutStorage/knutStorage.js';

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

export type NodeFilterOptions = {
	title: string;
	kegalias: string;
	content: string;
	tags: string[];
	date: string;
	links: string[];
	backlinks: string[];
	author: string;
	meta: Meta;
};

export type SearchOptions = {
	filter?: Filter<NodeFilterOptions>;
	limit?: number;
	strategy?: SearchStrategy;
};

export type NodeSearchResult = {
	kegalias: string;
	nodeId: string;
	title: string;
	updated: string;
	rank: number;
	tags: string[];
	author: string | null;
	meta: JSON;
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
	storage: KnutStorage;
};

type Repo = {
	keg: KegFile;
	dex: Dex;
	storage: KegStorage;
};

/**
 * Knut Provides a high level api for managing a keg
 **/
export class Knut {
	private repoMap = new Map<string, Repo>();
	private storage: KnutStorage;

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
		const knut = new Knut({ storage: store });
		await knut.init(config);
		return knut;
	}

	private constructor(options: KnutOptions) {
		this.storage = options?.storage;
	}

	/**
	 * Loads required data for a keg
	 */
	async loadKeg(kegAlias: string, options: KegOptions): Promise<void> {
		const storage =
			typeof options.storage === 'string'
				? loadKegStorage(options.storage)
				: options.storage;
		const dex = await Dex.fromStorage(storage);
		const keg = await KegFile.fromStorage(storage);
		if (keg === null || dex === null) {
			return;
		}

		this.repoMap.set(kegAlias, { keg: keg, dex: dex, storage });
	}

	async updateUserConfig(
		updater: (config: KnutConfigFile) => void,
	): Promise<void> {
		const userConfig = await KnutConfigFile.fromUserConfig(this.storage);
		const dataConfig = await KnutConfigFile.fromUserData(this.storage);

		updater(userConfig);
		this.storage.writeConfig(userConfig.filepath, userConfig);

		const config = dataConfig.concat(userConfig);
		this.init(config);
	}

	private async init(config: KnutConfigFile) {
		this.repoMap.clear();
		for (const keg of config.data.kegs) {
			await this.loadKeg(keg.alias, { storage: keg.url });
		}
	}

	async indexUpdate(kegAlias: string): Promise<boolean> {
		return false;
	}

	async nodeCreate(options: NodeCreateOptions): Promise<KegNode | null> {
		const repo = this.repoMap.get(options.kegalias);
		if (!repo) {
			return null;
		}
		const { keg, dex } = repo;
		const updated = now('Y-m-D H:M');
		repo.keg.update((data) => {
			data.updated = updated;
		});

		const nodeId = keg.getNodeId();
		const node = await KegNode.fromContent({
			content: options.content,
			updated,
		});
		repo.dex.addNode(nodeId, node);
		return node;
	}

	async nodeRead(options: NodeReadOptions): Promise<KegNode | null> {
		const repo = this.repoMap.get(options.kegalias);
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
		const repo = this.repoMap.get(kegalias);
		if (!repo) {
			return;
		}
		const { storage } = repo;
		const node = await KegNode.load(new NodeId(nodeId), storage);
		if (!node) {
			return;
		}
		if (content) {
			node.updateContent(content);
		}
		if (meta) {
			node.updateMeta(meta);
		}
	}

	async search({
		limit,
		filter,
	}: SearchOptions): Promise<NodeSearchResult[]> {
		const results: NodeSearchResult[] = [];
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
		for (const [kegalias, repo] of this.repoMap) {
			const { keg, dex } = repo;
			const author = keg.getAuthor();
			const entryList = dex.getEntries();
			for (const entry of entryList) {
				const node = await this.nodeRead({
					kegalias,
					nodeId: entry.nodeId,
				});
				const content = node?.content.stringify() ?? '';
				const tags = node?.getTags() ?? [];
				// Only include if node has the expected tag
				if (Array.isArray(filter?.tags)) {
					if (
						!filter.tags.reduce(
							(acc, tag) => acc && tags.includes(tag),
							true,
						)
					) {
						continue;
					}
				}
				data.push({
					content,
					kegalias,
					nodeId: entry.nodeId.stringify(),
					title: node?.title ?? '',
					author,
					tags: [...tags],
					updated: node?.updated ?? '',
					meta: node?.meta.export() ?? null,
				});
			}
		}
		const search = filter?.$text?.$search ?? '';
		if ((filter && Object.keys(filter).length === 0) || search === '') {
			const results: NodeSearchResult[] = [];
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

	async setConfig(
		kegpath: string,
		config: Partial<KegFileData>,
	): Promise<void> {
		const repo = this.repoMap.get(kegpath);
		if (!repo) {
			return;
		}
		const { keg, storage } = repo;
		keg.update((data) => {
			for (const key in config) {
				if (config.hasOwnProperty(key)) {
					const element = (config as any)[key];
					(data as any)[key] = element;
				}
			}
		});
		storage.write('keg', keg.toYAML());
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
		const repo = this.repoMap.get(kegpath);
		if (!repo) {
			return null;
		}
		const { keg, storage } = repo;
		const link = keg.getLink(nodeId);
		const node = await KegNode.load(nodeId, storage);
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

	getKegFile(kegalias: string): KegFile | null {
		const repo = this.repoMap.get(kegalias);
		return repo?.keg ?? null;
	}

	getDex(kegalias: string): Dex | null {
		const repo = this.repoMap.get(kegalias);
		return repo?.dex ?? null;
	}
}
