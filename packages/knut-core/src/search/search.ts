import { Filter } from '../filterTypes.js';
import { KegFile } from '../kegFile.js';
import { Meta } from '../metaFile.js';
import { JSON as MY_JSON } from '../utils.js';

export type IndexEntry = {
	nodeId: string;
	title: string;
	kegalias: string;
	content: string;
	tags: string[];
	updated: string;
	links: string[];
	backlinks: string[];
	author: string | null;
	meta: Meta;
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

export type SearchOptions = {
	filter?: Filter<IndexEntry>;
	limit?: number;
};

export type IndexOptions = {
	entries: IndexEntry[];
	keg: KegFile;
	kegalias: string;
};

export type SearchEngine = {
	search(options: SearchOptions): Promise<SearchResult[]>;

	/**
	 * Add an entry to search against
	 **/
	add(entry: IndexEntry): Promise<void>;

	/**
	 * Removes all documents from the list which the predicate returns truthy
	 * for, and returns an array of the removed docs. The predicate is invoked
	 * with two arguments: (entry: IndexEntry, index: number).
	 */
	remove(f: (entry: IndexEntry, idx: number) => boolean): Promise<void>;

	/**
	 * Create an index
	 **/
	index(): Promise<void>;
};
