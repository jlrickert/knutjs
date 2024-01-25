import Fuse, { FuseIndex, FuseOptionKey, FuseSearchOptions } from 'fuse.js';
import {
	IndexEntry,
	SearchEngine,
	SearchOptions,
	SearchResult,
} from './search.js';
import { KnutStorage } from '../knutStorage/index.js';
import { KnutPlugin } from '../knutPlugin.js';
import invariant from 'tiny-invariant';

type ClassicSearchOptions = {
	storage: KnutStorage;
	fileName?: string;
};

const keys: FuseOptionKey<IndexEntry>[] = [
	{ name: 'title', weight: 2 },
	'content',
	'tags',
	'author',
];

export class ClassicSearchEngine implements SearchEngine {
	private _fuse: Fuse<IndexEntry>;
	static async fromStorage({
		storage,
		fileName = 'fuse-index.json',
	}: ClassicSearchOptions): Promise<ClassicSearchEngine | null> {
		const rawIndex = await storage.readCache(fileName);
		if (!rawIndex) {
			return null;
		}
		const index = Fuse.parseIndex<IndexEntry>(rawIndex);

		const fuseOptions: FuseSearchOptions = {
			limit: 0,
		};
		// | undefined =
		// !limit || limit <= 0 ? undefined : { limit };
		// const data = Fuse.creaeIndex(keys, []);
		// const index = Fuse.parseIndex<Data>([]);
		return new ClassicSearchEngine(fileName, storage, index);
	}

	private constructor(
		private _fileName: string,
		private _storage: KnutStorage,
		private _index: FuseIndex<IndexEntry>,
	) {
		this._fuse = new Fuse([], { keys, ignoreLocation: true }, this._index);
	}

	async index(): Promise<void> {
		return this._storage.writeCache(
			this._fileName,
			JSON.stringify(this._fuse.getIndex().toJSON()),
		);
	}

	async add(entry: IndexEntry): Promise<void> {
		this._fuse.add(entry);
	}

	async remove(
		f: (entry: IndexEntry, idx: number) => boolean,
	): Promise<void> {
		this._fuse.remove(f);
	}

	async search(options: SearchOptions): Promise<SearchResult[]> {
		const fuse = new Fuse([], { keys, ignoreLocation: true }, this._index);
		const query = options.filter?.$text?.$search ?? '';
		const results = fuse.search(
			query,
			options.limit ? { limit: options.limit } : undefined,
		);
		return results.map(({ item, score }): SearchResult => {
			return {
				kegalias: item.kegalias,
				nodeId: item.nodeId,
				title: item.title,
				meta: item.meta.toJSON(),
				rank: score ?? -1,
				tags: item.tags,
				author: item.author,
				updated: item.updated,
			};
		});
	}

	// async indexNodes({ kegalias, keg, entries }: IndexOptions): Promise<void> {
	// 	for (const [id, node] of entries) {
	// 		const data: Data = {
	// 			content: node.content.stringify(),
	// 			kegalias: kegalias,
	// 			nodeId: id.stringify(),
	// 			title: node?.title ?? '',
	// 			author: keg.getAuthor(),
	// 			tags: [...node.getTags()],
	// 			updated: node?.updated ?? '',
	// 			meta: node?.meta.export() ?? null,
	// 		};
	// 		this._index.add(data);
	// 	}
	// 	await this._storage.writeCache(
	// 		this._fileName,
	// 		JSON.stringify(this._index.toJSON()),
	// 	);
	// }
}

export const classicSearchPlugin: KnutPlugin = async (ctx) => {
	// const engine = await ClassicSearchEngine.fromStorage(options);
	// if (!engine) {
	// 	return null;
	// }

	let index: FuseIndex<IndexEntry> | null = null;
	let fuse: Fuse<IndexEntry> | null = null;

	ctx.registerIndex('classic', async (knut) => {
		const getEntryList = async () => {
			const entries: IndexEntry[] = [];
			for await (const [kegalias, keg] of knut.getKegList()) {
				for await (const [nodeId, node] of keg.getNodeList()) {
					entries.push({
						kegalias,
						nodeId: nodeId.stringify(),
						content: node.content.stringify(),
						meta: node.meta,
						tags: [...node.getTags()],
						links: [],
						title: node.title,
						author: keg.kegFile.getAuthor(),
						updated: node.updated,
						backlinks: [],
					});
				}
			}
			return entries;
		};
		const update = async () => {
			const entries: IndexEntry[] = [];
			for await (const [kegalias, keg] of knut.getKegList()) {
				for await (const [nodeId, node] of keg.getNodeList()) {
					entries.push({
						kegalias,
						nodeId: nodeId.stringify(),
						content: node.content.stringify(),
						meta: node.meta,
						tags: [...node.getTags()],
						links: [],
						title: node.title,
						author: keg.kegFile.getAuthor(),
						updated: node.updated,
						backlinks: [],
					});
				}
			}
			index = Fuse.createIndex<IndexEntry>(keys, entries);
			fuse = new Fuse(entries, { keys }, index);
			return ctx.storage.writeCache(
				'fuse-index.json',
				JSON.stringify(fuse.getIndex().toJSON()),
			);
		};
		return {
			async init() {
				const content = await ctx.storage.readCache('fuse-index.json');
				if (!content) {
					await update();
					return;
				}
				const entries = await getEntryList();
				index = Fuse.parseIndex<IndexEntry>(content);
				fuse = new Fuse(
					entries,
					{ keys, useExtendedSearch: true, ignoreLocation: true },
					index,
				);
			},
			async merge(storage) {
				const content = await ctx.storage.readCache('fuse-index.json');
				if (!content) {
					return;
				}
				await storage.writeCache('fuse-index.json', content);
			},
			update,
		};
	});

	ctx.registerSearch('classic', async (options) => {
		invariant(fuse, 'Expect plugin to be initiated');
		const query = options.filter?.$text?.$search ?? '';
		const results = fuse.search(
			query,
			options.limit ? { limit: options.limit } : undefined,
		);
		return results.map(({ item, score }): SearchResult => {
			return {
				kegalias: item.kegalias,
				nodeId: item.nodeId,
				title: item.title,
				meta: item.meta.toJSON(),
				rank: score ?? -1,
				tags: item.tags,
				author: item.author,
				updated: item.updated,
			};
		});
	});
};
