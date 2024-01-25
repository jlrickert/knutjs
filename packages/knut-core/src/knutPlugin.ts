import { KnutConfigFile } from './configFile.js';
import { Knut } from './knut.js';
import { KnutStorage } from './knutStorage/index.js';
import { SearchOptions, SearchResult } from './search/search.js';

export type UpdateContext = {};

export type SearchContext = {
	options: SearchOptions;
};

type OnSearchContext = {
	name: string;
	config: KnutConfigFile;
	results: SearchResult[];
	search(): SearchResult[];
	next(results: SearchResult[]): SearchResult[];
};

type OnIndexContext = {
	name: string;
	next: () => void;
};

export type KnutIndex = {
	init?(): Promise<void>;
	load?(): Promise<string | null>;
	merge?(storage: KnutStorage): Promise<void>;
	update?(): Promise<void>;
	depends?: string[];
};

export type SearchFn = (options: SearchOptions) => Promise<SearchResult[]>;

export type KnutPluginContext = {
	config: KnutConfigFile;
	storage: KnutStorage;
	registerSearch(name: string, search: SearchFn): void;
	onSearch(f: (ctx: OnSearchContext) => Promise<void>): void;
	registerIndex(name: string, f: (knut: Knut) => Promise<KnutIndex>): void;
	onIndex(f: (ctx: OnIndexContext) => Promise<void>): void;
};

export type KnutPlugin = (ctx: KnutPluginContext) => void;
