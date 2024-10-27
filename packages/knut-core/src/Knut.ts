import Fuse, { FuseIndex, FuseOptionKey, FuseSearchOptions } from 'fuse.js';
import { KnutConfigFile } from './KnutConfigFile.js';
import { Filter } from './Utils/FilterTypes.js';
import { Backend } from './Backend/index.js';
import {
	Future,
	FutureResult,
	Optional,
	pipe,
	Result,
	stringify,
} from './Utils/index.js';
import { KnutError } from './Data/KnutError.js';
import { Keg } from './Keg.js';
import { BackendError, KegUri, NodeId, NodeMeta } from './Data/index.js';
import { KegNode } from './KegNode.js';

export type NodeCreateOptions = {
	kegalias: string;
	content: string;
	meta?: NodeMeta.NodeMeta;
	items?: Buffer[];
};

export type NodeReadOptions = {
	kegalias: string;
	nodeId: NodeId.NodeId;
};

export type NodeUpdateOptions = {
	kegalias: string;
	nodeId: string;
	content?: string;
	meta?: NodeMeta.NodeMeta | ((meta: NodeMeta.NodeMeta) => void);
};

export type NodeDeleteOptions = {
	kegalias: string;
	nodeId: NodeId.NodeId;
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
	meta: NodeMeta.NodeMeta;
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
	meta: NodeMeta.NodeMeta;
};

export type ShareOptions = {
	kegalias: string;
	nodeId: NodeId.NodeId;
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
	static fromBackend(backend: Backend.Backend): Knut {
		return new Knut(backend);
	}

	/**
	 * Loads knut instance from a backend
	 */
	static async make(): Future.Future<Knut> {
		const backend = await Backend.detectBackend();
		return Knut.fromBackend(backend);
	}

	private constructor(public readonly backend: Backend.Backend) {}

	async getKeg(kegAlias: string): Future.FutureResult<Keg, KnutError> {
		return FutureResult.chain(this.backend.loader(kegAlias), (storage) => {
			return Keg.fromStorage({ storage, backend: this.backend });
		});
	}

	async getNode(
		uri: KegUri.KegUri,
	): Future.FutureResult<KegNode, KnutError[]> {
		const { kegalias, nodeId } = uri;
		if (Optional.isNone(nodeId)) {
			return Result.err([
				BackendError.invalidURI({
					uri,
					message: `URI ${KegUri.stringify(
						uri,
					)} doesn't contain a nodeId`,
				}),
			]);
		}
		return pipe(
			this.getKeg(kegalias),
			FutureResult.match({
				onOk: async (keg) => {
					return keg.getNode(nodeId);
				},
				onErr: async (error) => {
					return Result.err([error]);
				},
			}),
		);
	}

	// async *getKegList() {
	// 	const config = await KnutConfigFile.fromBackend(this.backend);
	// 	for (const kegalias of config.data.kegs.map((a) => a.alias)) {
	// 		const keg = await FutureResult.chain(
	// 			this.backend.loader(kegalias),
	// 			(storage) => Keg.fromStorage(storage),
	// 		);
	// 		if (Result.isOk(keg)) {
	// 			yield [kegalias, keg] as const;
	// 		}
	// 	}
	// }
	//
	async getConfig() {
		return KnutConfigFile.fromBackend(this.backend);
	}

	// *getEntryList() {
	// 	for (const [kegalias, keg] of this.kegMap) {
	// 		for (const entry of keg.dex.entries) {
	// 			yield [kegalias, entry] as const;
	// 		}
	// 	}
	// }
	//
	// async *getNodeList() {
	// 	for (const [kegalias, keg] of this.kegMap) {
	// 		for await (const [nodeId, node] of keg.getNodeList()) {
	// 			yield [kegalias, nodeId, node] as const;
	// 		}
	// 	}
	// }

	async update(options: {
		filter?: (keg: Keg) => boolean;
	}): Future.FutureOptional<KnutError[]> {
		const config = await this.getConfig();
		const errors: KnutError[] = [];
		for (const kegConfig of config.data.kegs) {
			const keg = await this.getKeg(kegConfig.alias);
			if (Result.isErr(keg)) {
				continue;
			}
			if (
				Optional.isNone(options.filter) ||
				(Optional.isSome(options.filter) && options.filter(keg.value))
			) {
				const updateErrors = await keg.value.update();
				if (Optional.isSome(updateErrors)) {
					errors.push(updateErrors);
				}
			}
		}
		Result.tapError(
			await this.backend.cache.rm('fuse-data.json'),
			(error) => errors.push(error),
		);
		Result.tapError(
			await this.backend.cache.rm('fuse-index.json'),
			(error) => errors.push(error),
		);
		if (errors.length > 0) {
			return Optional.some(errors);
		}
		return Optional.none;
	}

	async search({
		limit,
		filter,
	}: SearchOptions): Future.Future<SearchResult[]> {
		const results: SearchResult[] = [];
		type Data = {
			nodeId: string;
			kegalias: string;
			content: string;
			title: string;
			author: string | null;
			tags: string[];
			updated: string;
			meta: NodeMeta.NodeMeta;
		};
		const rawData = await this.backend.cache.read('fuse-data.json');
		let data = Result.isOk(rawData)
			? (JSON.parse(rawData.value) as Data[])
			: Optional.none;

		if (Optional.isNone(data)) {
			data = [];
			const config = await this.getConfig();
			for (const kegConfig of config.data.kegs) {
				const keg = await this.getKeg(kegConfig.alias);
				if (Result.isErr(keg)) {
					continue;
				}
				const nodes = await keg.value.getNodeList();
				if (Result.isErr(nodes)) {
					continue;
				}
				for (const nodeId of nodes.value) {
					const node = await keg.value.getNode(nodeId);
					if (Result.isErr(node)) {
						continue;
					}
					data.push({
						content: node.value.getContent(),
						kegalias: kegConfig.alias,
						nodeId: stringify(nodeId),
						title: node.value.getTitle() ?? '',
						author: keg.value.config.getCreator() ?? '',
						tags: node.value.getTags(),
						updated: stringify(node.value.getUpdatedAt()),
						meta: node.value.getMeta(),
					});
				}
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
		if (Result.isErr(indexData)) {
			index = Fuse.createIndex(keys, data);
			await this.backend.cache.write(
				'fuse-index.json',
				JSON.stringify(index.toJSON()),
			);
		} else {
			index = Fuse.parseIndex<Data>(JSON.parse(indexData.value));
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
	async publish(
		kegpath: string,
		options?: PublishOptions,
	): Future.Future<void> {}

	/**
	 * Share a specific shareable node by providing a link.
	 */
	async share({
		kegalias,
		nodeId,
	}: ShareOptions): Future.FutureOptional<string> {
		return null;
	}

	/**
	 * Remove access to a node
	 **/
	async unshare(options: ShareOptions): Future.Future<void> {}

	/**
	 * import nodes from another keg. Used for combining multiple kegs into 1.
	 */
	async merge(from: string | string[], to: string): Future.Future<void> {}
}
