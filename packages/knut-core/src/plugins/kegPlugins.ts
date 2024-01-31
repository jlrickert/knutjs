// import { Filter } from '../filterTypes.js';
// import { Keg } from '../keg.js';
// import { MetaFile } from '../metaFile.js';
// import { SearchPlugin } from './knutPlugins.js';
//
// export type KegIndexPlugin = {
// 	name: string;
// 	/**
// 	 * init hook to run when first loading
// 	 **/
// 	// init?: () => Promise<void>;
// 	// addNode?: (node: KegNode) => Promise<void>;
// 	// modifyNode?: (node: KegNode) => Promise<void>;
// 	// removeNode?: (node: KegNode) => Promise<void>;
// 	update?: () => Promise<void>;
// 	reload?: () => Promise<void>;
// };
// export type KegIndexContext = {
// 	keg: Keg;
// };
// export type KegIndexCreator = (ctx: KegIndexContext) => Promise<KegIndexPlugin>;
//
// export type KegSearchFilterOptions = {
// 	title: string;
// 	content: string;
// 	tags: string[];
// 	date: string;
// 	links: string[];
// 	backlinks: string[];
// 	author: string;
// 	meta: MetaFile;
// };
//
// export type KegSearchOptions = {
// 	filter?: Filter<KegSearchFilterOptions>;
// 	limit?: number;
// };
//
// export type KegSearchResult = {
// 	nodeId: string;
// 	title: string;
// 	updated: string;
// 	rank: number;
// 	tags: string[];
// 	author: string | null;
// 	meta: JSON;
// };
//
// export type KegSearchFn = (
// 	options: KegSearchOptions,
// ) => Promise<KegSearchResult[]>;
// export type KegSearchPlugin = {
// 	name: string;
// 	search: KegSearchFn;
// };
//
// export type KegSearchContext = {
// 	keg: Keg;
// };
//
// export type KegSearchCreator = (ctx: KegSearchContext) => Promise<SearchPlugin>;
//
// export const defineSearchPlugin = async (
// 	creator: KegSearchCreator,
// ): Promise<KegSearchCreator> => {
// 	return creator;
// };
//
// export const defineIndexPlugin = async (
// 	creator: KegIndexCreator,
// ): Promise<KegIndexCreator> => {
// 	return creator;
// };
