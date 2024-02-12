import Fuse, { FuseIndex, FuseOptionKey, FuseSearchOptions } from 'fuse.js';
import { KegPlugin, KegPluginContext } from '../internal/plugins/kegPlugin.js';
import {
	SearchParams,
	SearchResult,
	searchPluginM,
} from '../internal/plugins/searchPlugin.js';
import { Keg } from '../keg.js';
import { MY_JSON, hashString, stringify } from '../utils.js';
import { GenericStorage } from '../storage/storage.js';

type Data = {
	nodeId: string;
	content: string;
	title: string;
	author: string | null;
	tags: string[];
	updated: string;
	meta: MY_JSON;
};

export const FUSE_DATA_FILE = 'fuse-data.json' as const;
export const FUSE_INDEX_FILE = 'fuse-index.json' as const;

const KEYS: FuseOptionKey<Data>[] = [{ name: 'title', weight: 2 }, 'content'];

export class FusePlugin implements KegPlugin {
	name = 'fuse';
	depends = ['nodes'];
	summary? = 'Search powered by Fuse.js';
	async activate(ctx: KegPluginContext): Promise<void> {
		ctx.registerIndex({
			name: 'fuse',
			depends: ['nodes'],
			update: async () => {},
		});
		ctx.registerSearch({
			name: 'fuse',
			search: (options) => this.search(ctx.keg, options),
		});
	}

	async deactivate(ctx: KegPluginContext): Promise<void> {}

	async search(
		keg: Keg,
		{ filter, limit }: SearchParams,
	): Promise<SearchResult[]> {
		const [data, index] = await this.getSearchContext(keg);
		const fuse = new Fuse(
			data,
			{
				keys: KEYS,
				ignoreLocation: true,
				includeScore: true,
				isCaseSensitive: false,
				findAllMatches: true,
			},
			index,
		);

		const search = filter?.$text?.$search ?? '';
		if (Array.isArray(filter?.tags)) {
			filter.tags;
		}
		const fuseOptions: FuseSearchOptions | undefined =
			!limit || limit <= 0 ? undefined : { limit };
		const fuseResult = fuse.search(search, fuseOptions);
		const results = fuseResult.map((a) => {
			return searchPluginM.makeSearchResult({
				...a.item,
				rank: a.score ?? 0,
				kegalias: null,
			});
		});
		return results;
	}

	async getSearchContext(keg: Keg): Promise<[Data[], FuseIndex<Data>]> {
		const dataP = this.readDataContent(keg);
		const indexP = this.readIndexContent(keg);
		const data = await dataP;
		const index = await indexP;
		if (data === null || index === null) {
			return this.update(keg);
		}
		return [data, index];
	}

	async getPluginStorage(keg: Keg): Promise<GenericStorage> {
		const dirname = hashString(keg.storage.root)
			.toString(16)
			.padStart(8, '0');
		const storage = keg.cache.child(dirname);
		return storage;
	}

	async update(keg: Keg): Promise<[Data[], FuseIndex<Data>]> {
		const storage = await this.getPluginStorage(keg);
		const data = await this.buildData(keg);
		const index = this.buildIndexFromData(data);
		await storage.write(FUSE_DATA_FILE, JSON.stringify(data));
		await storage.write(FUSE_INDEX_FILE, JSON.stringify(index.toJSON()));
		return [data, index];
	}

	async readDataContent(keg: Keg): Promise<Data[] | null> {
		const storage = await this.getPluginStorage(keg);
		const rawData = await storage.read(FUSE_DATA_FILE);
		if (rawData === null) {
			return null;
		}
		const data = JSON.parse(rawData);
		// TODO(jared) verify with zod
		return data;
	}

	async readIndexContent(keg: Keg): Promise<FuseIndex<Data> | null> {
		const storage = await this.getPluginStorage(keg);
		const rawData = await storage.read(FUSE_INDEX_FILE);
		if (rawData === null) {
			return null;
		}
		const index = Fuse.parseIndex<Data>(JSON.parse(rawData));
		return index;
	}

	async buildData(keg: Keg): Promise<Data[]> {
		const data: Data[] = [];
		for await (const [nodeId, node] of keg.getNodeList()) {
			data.push({
				nodeId: stringify(nodeId),
				meta: stringify(node.meta),
				tags: node.getTags(),
				title: node.title,
				author: keg.kegFile.getAuthor(),
				content: node.content,
				updated: stringify(node.updated),
			});
		}
		return data;
	}

	async buildIndex(keg: Keg): Promise<FuseIndex<Data>> {
		const data = await this.buildData(keg);
		const index = this.buildIndexFromData(data);
		return index;
	}

	buildIndexFromData(data: Data[]): FuseIndex<Data> {
		const index = Fuse.createIndex<Data>(KEYS, data);
		return index;
	}
}
