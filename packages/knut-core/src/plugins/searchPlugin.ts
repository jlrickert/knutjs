import { Filter } from '../filterTypes.js';
import { Keg } from '../keg.js';
import { KegFile } from '../kegFile.js';
import { EnvStorage } from '../envStorage.js';
import { MetaFile } from '../metaFile.js';
import { JSON as MY_JSON } from '../utils.js';

export type SearchIndexEntry = {
	nodeId: string;
	title: string;
	kegalias?: string;
	content: string;
	tags: string[];
	updated: string;
	links: string[];
	backlinks: string[];
	author: string | null;
	meta: MetaFile;
};

export type SearchResult = {
	kegalias?: string;
	nodeId: string;
	title: string;
	updated: string;
	rank: number;
	tags: string[];
	author: string | null;
	meta: MY_JSON;
};

export type SearchOptions = {
	filter?: Filter<SearchIndexEntry>;
	limit?: number;
};

export type IndexOptions = {
	entries: SearchIndexEntry[];
	keg: KegFile;
	kegalias: string;
};

export type SearchFn = (options: SearchOptions) => Promise<SearchResult[]>;
export type SearchPlugin = {
	name: string;
	search: SearchFn;
};

export type SearchPluginContext = {
	keg: Keg;
	kegalias?: string;
	storage?: EnvStorage;
};

export type SearchPluginCreator = (
	ctx: SearchPluginContext,
) => Promise<SearchPlugin>;
