import { pipe } from 'fp-ts/lib/function.js';
import Fuse, { FuseIndex, FuseOptionKey, FuseSearchOptions } from 'fuse.js';
import { KnutConfigFile } from './configFile.js';
import { Filter } from './filterTypes.js';
import { MetaFile, MetaData } from './metaFile.js';
import { NodeId } from './node.js';
import { MY_JSON, stringify } from './utils.js';
import { Keg } from './keg.js';
import invariant from 'tiny-invariant';
import { Future, future } from './internal/future.js';
import { Optional, optional } from './internal/optional.js';
import { optionalT } from './internal/optionalT.js';
import { Backend, backend as backendM } from './backend.js';
import { GenericStorage } from './storage/storage.js';

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

export type KnutOptions = {};

/**
 * Knut Provides a high level api for managing a keg
 **/
export class Knut {
	private kegMap = new Map<string, Keg>();

	static async fromBackend(backend: Backend): Future<Knut> {
		const load = async (storage: GenericStorage) => {
			const config =
				(await KnutConfigFile.fromStorage(storage)) ??
				KnutConfigFile.create(storage.root);
			return config;
		};
		const varConfig = await load(backend.variable);
		const configFile = await load(backend.config);
		const knut = new Knut(backend);
		await knut.loadConfig(varConfig);
		await knut.loadConfig(configFile);
		return knut;
	}

	static async fromConfig(
		config: KnutConfigFile,
		backend: Backend,
	): Future<Knut> {
		const knut = new Knut(backend);
		await knut.loadConfig(config);
		return knut;
	}

	static async create(): Future<Optional<Knut>> {
		const T = optionalT(future.Monad);
		const knut = await pipe(
			backendM.detectBackend(),
			T.chain(Knut.fromBackend),
		);
		return knut;
	}

	private constructor(public readonly backend: Backend) {}

	async reset() {
		// TODO(Jared): deactive keg plugins before clearing
		this.kegMap.clear();
	}

	async loadConfig(config: KnutConfigFile) {
		for (const keg of config.resolve().data.kegs) {
			const storage = await this.backend.loader(keg.url);
			if (optional.isSome(storage)) {
				await this.loadKeg(keg.alias, storage);
			}
		}
		return future.of<void>(void {});
	}

	/**
	 * Loads required data for a keg
	 */
	async loadKeg(kegalias: string, storage: GenericStorage): Future<void> {
		const keg = await Keg.fromStorage(storage);
		if (optional.isNone(keg)) {
			return;
		}
		this.kegMap.set(kegalias, keg);
	}

	async initKeg(
		alias: string,
		uri: string,
		options?: { enabled: boolean },
	): Future<Optional<Keg>> {
		const T = optionalT(future.Monad);

		const keg = await pipe(this.backend.loader(uri), T.chain(Keg.init));

		if (optional.isNone(keg)) {
			return optional.none;
		}

		this.kegMap.set(alias, keg);

		// Update variable configuration to include the new keg
		await pipe(
			KnutConfigFile.fromStorage(this.backend.variable),
			T.alt(() =>
				T.some(KnutConfigFile.create(this.backend.variable.root)),
			),
			T.map((config) => {
				config.data.kegs.push({
					enabled: options?.enabled ?? true,
					url: keg.storage.root,
					alias,
				});
				return config;
			}),
			T.chain((config) => {
				return config.toStorage(this.backend.variable);
			}),
		);

		return keg;
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

	async update(): Future<void> {
		this.backend.cache.rm('fuse-data.json');
		this.backend.cache.rm('fuse-index.json');
	}

	async search({ limit, filter }: SearchOptions): Future<SearchResult[]> {
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
		const rawData = await this.backend.cache.read('fuse-data.json');
		let data = rawData ? (JSON.parse(rawData) as Data[]) : optional.none;

		if (optional.isNone(data)) {
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
					author: pipe(
						author,
						optional.getOrElse(() => null),
					),
					tags: [...tags],
					updated: stringify(node.updated),
					meta: node?.meta.export() ?? null,
				});
			}
		}
		if (rawData === null) {
			this.backend.cache.write('fuse-data.json', JSON.stringify(data));
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
		const indexData = await this.backend.cache.read('fuse-index.json');
		let index: FuseIndex<Data>;
		if (!indexData) {
			index = Fuse.createIndex(keys, data);
			await this.backend.cache.write(
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
	async publish(kegpath: string, options?: PublishOptions): Future<void> {}

	/**
	 * Share a specific shareable node by providing a link.
	 */
	async share({ kegalias, nodeId }: ShareOptions): Future<Optional<string>> {
		return null;
	}

	/**
	 * Remove access to a node
	 **/
	async unshare(options: ShareOptions): Future<void> {}

	/**
	 * import nodes from another keg. Used for combining multiple kegs into 1.
	 */
	async merge(from: string | string[], to: string): Future<void> {}
}
