import { EnvStorage } from '../envStorage.js';
import { Knut } from '../knut.js';
import { SearchFn, SearchResult } from './searchPlugin.js';

export type KnutPluginHooks = {
	registerSearch: (name: string, fn: SearchFn) => Promise<void>;
	registerIndex: (
		name: string,
		f: (ctx: { knut: Knut }) => Promise<void>,
	) => Promise<void>;
	// onSearch(
	// 	name: string,
	// 	results: SearchResult[],
	// 	next: (results: SearchResult[]) => void,
	// );
};

export type kegPluginHooks = {
	registerSearch: (name: string, fn: SearchFn) => Promise<void>;
	// registerIndex: (name: string, )
};

export type Context = {
	storage: EnvStorage;
	hooks: {
		knut: KnutPluginHooks;
		keg: kegPluginHooks;
	};
};

export type KnutPlugin = (ctx: Context) => Promise<void>;

export type AppPlugin = <Ctx>(ctx: Ctx) => Promise<{
	index: Array<(ctx: Ctx) => Promise<void>>;
	search: Array<(ctx: Ctx, search: SearchFn) => Promise<void>>;
	publish: Array<(ctx: Ctx) => Promise<void>>;
	view: Array<(ctx: Ctx) => Promise<void>>;
}>;

const fusePlugin = (): AppPlugin => {
	return async (ctx) => {
		return { index: [(x) => {}], search: [], view: [], publish: [] };
	};
	// ctx.storage;
	// ctx.hooks.knut.registerSearch('fuse', ({ filter, limit }) => {
	// 	// create or load index
	// 	// load data. Maybe utalize cache magic here
	// 	// do the search and return results
	// });
	// ctx.hooks.knut.registerIndex('fuse-index', ({ knut }) => {
	// 	// load all nodes from all kegs
	// 	// create index
	// });
	//
	// ctx.hooks.keg.registerSearch('fuse', ({}) => {});
	// ctx.hooks.keg.registerIndex('fuse-index', ({ keg }) => {});
};
