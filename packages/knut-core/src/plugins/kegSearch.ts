// import { Filter } from '../filterTypes.js';
// import { Keg } from '../keg.js';
// import { KegFile } from '../kegFile.js';
// import { KnutStorage } from '../knutStorage.js';
// import { MetaFile } from '../metaFile.js';
// import { JSON as MY_JSON } from '../utils.js';
//
// export type KegIndexEntry = {
// 	nodeId: string;
// 	title: string;
// 	content: string;
// 	tags: string[];
// 	updated: string;
// 	links: string[];
// 	backlinks: string[];
// 	author: string | null;
// 	meta: MetaFile;
// };
//
// export type KegSearchResult = {
// 	nodeId: string;
// 	title: string;
// 	updated: string;
// 	rank: number;
// 	tags: string[];
// 	author: string | null;
// 	meta: MY_JSON;
// };
//
// export type KegSearchOptions = {
// 	filter?: Filter<KegIndexEntry>;
// 	limit?: number;
// };
//
// export type KnutIndexOptions = {
// 	entries: KegIndexEntry[];
// 	keg: KegFile;
// 	kegalias: string;
// };
//
// export type KegSearchFn = (
// 	options: KegSearchOptions,
// ) => Promise<KegSearchResult[]>;
// export type KnutSearchPlugin = {
// 	name: string;
// 	search: KegSearchFn;
// };
//
// export type KegKnutSearchPluginContext = {
// 	keg: Keg;
// 	kegalias: string;
// 	storage: KnutStorage;
// };
//
// export type KegSearchPluginCreator = (
// 	ctx: KegKnutSearchPluginContext,
// ) => Promise<KnutSearchPlugin>;
