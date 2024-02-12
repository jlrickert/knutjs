import { Filter } from '../../filterTypes.js';
import { MetaFile } from '../../metaFile.js';
import { MY_JSON } from '../../utils.js';

export type SearchResult = {
	kegalias: string | null;
	nodeId: string;
	title: string;
	updated: string;
	rank: number;
	tags: string[];
	author: string | null;
	meta: MY_JSON;
};

export type SearchFilterOptions = {
	title: string;
	kegalias?: string;
	content: string;
	tags: string[];
	date: string;
	links: string[];
	backlinks: string[];
	author: string;
	meta: MetaFile;
};

export type SearchParams = {
	filter?: Filter<SearchFilterOptions>;
	limit?: number;
};

export type SearchFn = (params: SearchParams) => Promise<SearchResult[]>;

export type SearchPlugin = {
	name: string;
	summary?: string;
	search: SearchFn;
};

export const makeSearchResult = (result: SearchResult): SearchResult => ({
	rank: result.rank,
	nodeId: result.nodeId,
	kegalias: result.kegalias,
	meta: result.meta,
	updated: result.updated,
	author: result.author,
	title: result.title,
	tags: result.tags,
});

export const searchPluginM = {
	makeSearchResult,
};
