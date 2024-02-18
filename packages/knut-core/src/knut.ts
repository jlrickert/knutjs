import Fuse, { FuseIndex, FuseOptionKey, FuseSearchOptions } from 'fuse.js';
import { ConfigDefinition, KnutConfigFile } from './configFile.js';
import { Filter } from './filterTypes.js';
import { MetaFile, MetaData } from './metaFile.js';
import { NodeId } from './node.js';
import { MY_JSON, stringify } from './utils.js';
import { EnvStorage } from './envStorage.js';
import { Keg } from './keg.js';
import { KegStorage, loadKegStorage } from './kegStorage.js';
import invariant from 'tiny-invariant';
import { MyPromise } from './internal/promise.js';
import { Optional } from './internal/optional.js';

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
	filter?: Filter<NodeFilterOptions>;
	limit?: number;
	strategy?: SearchStrategy;
};

export type SearchResult = {
	kegalias: string;
	nodeId: string;
	title: string;
	updated: string;
	rank: number;
	tags: string[];
	author: string | null;
	meta: MY_JSON;
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

/**
 * Knut Provides a high level api for managing a keg
 **/
export class Knut {
	private kegMap = new Map<string, Keg>();

	static async create(): MyPromise<Knut> {
		const env = await EnvStorage.create();
		const knut = await Knut.fromEnvironment(env.child('knut'));
		return knut;
	}

	static async fromEnvironment(env: EnvStorage): MyPromise<Knut> {
		const configFile = await KnutConfigFile.fromEnvStorage(env, {
			resolve: true,
		});
		const knut = await Knut.fromConfig(configFile.data, { env: env });
		return knut;
	}

	static async fromConfig(
		config: ConfigDefinition,
		options?: KnutOptions,
	): MyPromise<Knut> {
		const env = options?.env ?? EnvStorage.createInMemory();
		const knut = new Knut(env);
		await knut.init(config);
		return knut;
	}

	private constructor(public readonly env: EnvStorage) {}

	/**
	 * Loads required data for a keg
	 */
	async loadKeg(kegalias: string, storage: KegStorage): MyPromise<void> {
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

	getKeg(kegalias: string): Optional<Keg> {
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

	async update(): MyPromise<void> {
		this.env.cache.rm('fuse-data.json');
		this.env.cache.rm('fuse-index.json');
	}

	async search({ limit, filter }: SearchOptions): MyPromise<SearchResult[]> {
		const results: SearchResult[] = [];
		type Data = {
			nodeId: string;
			kegalias: string;
			content: string;
			title: string;
			author: string | null;
			tags: string[];
			updated: string;
			meta: MY_JSON;
		};
		const rawData = await this.env.cache.read('fuse-data.json');
		let data = rawData ? (JSON.parse(rawData) as Data[]) : null;

		if (data === null) {
			data = [];
			for await (const [kegalias, nodeId, node] of this.getNodeList()) {
				const keg = this.getKeg(kegalias);
				invariant(
					keg,
					'Expect to get the keg that the node belongs to',
				);
				const author = keg.kegFile.getAuthor();
				const content = node?.content;
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
					nodeId: stringify(nodeId),
					title: node?.title ?? '',
					author,
					tags: [...tags],
					updated: node?.updated ?? '',
					meta: node?.meta.export() ?? null,
				});
			}
		}
		if (rawData === null) {
			this.env.cache.write('fuse-data.json', JSON.stringify(data));
		}

		const search = filter?.$text?.$search ?? '';
		if ((filter && Object.keys(filter).length === 0) || search === '') {
			const results: SearchResult[] = [];
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
		const indexData = await this.env.cache.read('fuse-index.json');
		let index: FuseIndex<Data>;
		if (!indexData) {
			index = Fuse.createIndex(keys, data);
			await this.env.cache.write(
				'fuse-index.json',
				JSON.stringify(index.toJSON()),
			);
		} else {
			index = Fuse.parseIndex<Data>(JSON.parse(indexData));
		}
		const fuse = new Fuse(
			data,
			{
				keys,
				ignoreLocation: true,
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
	async publish(kegpath: string, options?: PublishOptions): MyPromise<void> {}

	/**
	 * Share a specific shareable node by providing a link.
	 */
	async share({
		kegalias,
		nodeId,
	}: ShareOptions): MyPromise<Optional<string>> {
		return null;
	}

	/**
	 * Remove access to a node
	 **/
	async unshare(options: ShareOptions): MyPromise<void> {}

	/**
	 * import nodes from another keg. Used for combining multiple kegs into 1.
	 */
	async merge(from: string | string[], to: string): MyPromise<void> {}
}
