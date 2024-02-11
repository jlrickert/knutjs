import { Filter } from '../../filterTypes.js';
import { MetaFile } from '../../metaFile.js';

export type SearchResult = {
	kegalias: string;
	nodeId: string;
	title: string;
	updated: string;
	rank: number;
	tags: string[];
	author: string | null;
	meta: JSON;
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
