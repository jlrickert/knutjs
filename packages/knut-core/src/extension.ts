import { absurd } from 'fp-ts/lib/function.js';
import { Future } from './internal/future.js';
import { Keg } from './keg.js';
import { Knut } from './knut.js';
import { KegNode } from './node.js';
import { MY_JSON } from './utils.js';
import { Optional } from './internal/optional.js';

export type KnutContext<A extends {} = {}> = { knut: Knut } & A;
export type KegContext<A extends {} = {}> = { keg: Keg } & A;
export type CliContext = {};
export type UIContext = {};
export type ExtensionContext = KnutContext | KegContext;

export type SearchAllResult = {
	kegalias: string;
	nodeId: string;
	title: string;
	updated: string;
	rank: number;
	tags: string[];
	author: string | null;
	meta: MY_JSON;
};

export type SearchResult = Omit<SearchAllResult, 'kegalias'>;

export type ActionMap = {
	all: (context: Extension) => Future<void>;
	init: (context: KnutContext) => Future<void>;
	searchAll: (
		context: KnutContext,
		f: (nodeId: string[]) => SearchAllResult[],
	) => Future<SearchAllResult[]>;
	updateAll: (context: KnutContext) => Future<void>;

	initKeg: (context: KegContext) => Future<void>;
	search: (context: KegContext) => Future<void>;
	update: (context: KegContext) => Future<void>;

	nodeCreate: (context: KegContext) => Future<void>;
	nodeRead: (
		context: { keg: Keg },
		node: Optional<KegNode>,
	) => Future<Optional<KegNode>>;
	nodeUpdate: (context: KegContext) => Future<Optional<KegNode>>;
	nodeDelete: (context: {}) => Future<void>;
};

export type FilterMap = {
	initKegs: (kegs: Keg[]) => Future<Keg[]>;
	searchAllKegs: (keg: Keg[]) => Future<Keg[]>;
	searchAllNodes: (node: KegNode[]) => Future<KegNode[]>;
	searchAllResults: (node: SearchAllResult[]) => Future<SearchAllResult[]>;
	searchNodes: (node: KegNode[]) => Future<KegNode[]>;
	searchResults: (node: SearchResult[]) => Future<SearchResult[]>;
};

export type ExtensionAction = keyof ActionMap;
export type ExtensionFilter = keyof FilterMap;

export abstract class Extension {
	abstract name: string;
	abstract depends: string[];

	abstract activate(): Future<(() => void) | void>;

	private actionMap: {
		[Action in ExtensionAction]: ActionMap[Action][];
	} = {
		update: [],
		updateAll: [],
		all: [],
		init: [],
		search: [],
		initKeg: [],
		searchAll: [],
		nodeCreate: [],
		nodeRead: [],
		nodeUpdate: [],
		nodeDelete: [],
	};

	protected onAction<Action extends ExtensionAction>(
		action: Action,
		f: ActionMap[Action],
	) {
		this.actionMap[action].push(f);
		return () => {
			const index = this.actionMap[action].findIndex((a) => a === f);
			if (index < 0) {
				return;
			}
			delete this.actionMap[action][index];
		};
	}

	async emit<Action extends ExtensionAction>(
		action: Action,
		...context: Parameters<ActionMap[Action]>
	): Future<void> {
		switch (action) {
			case 'all': {
				const [ctx] = context as Parameters<ActionMap['all']>;
				const hooks = this.actionMap.all;
				for (const hook of hooks) {
					await hook(ctx);
				}
				return;
			}
			case 'init': {
				const [ctx] = context as Parameters<ActionMap['init']>;
				const hooks = this.actionMap.init;
				for (const hook of hooks) {
					await hook(ctx);
				}
				return;
			}
			case 'initKeg': {
				const [ctx] = context as Parameters<ActionMap['init']>;
				const hooks = this.actionMap.init;
				for (const hook of hooks) {
					await hook(ctx);
				}
				return;
			}
			case 'nodeCreate': {
				const [ctx] = context as Parameters<ActionMap['nodeCreate']>;
				const hooks = this.actionMap.nodeCreate;
				for (const hook of hooks) {
					await hook(ctx);
				}
				return;
			}
			case 'nodeRead': {
				const [keg, node] = context as Parameters<
					ActionMap['nodeRead']
				>;
				const hooks = this.actionMap.nodeRead;
				for (const hook of hooks) {
					await hook(keg, node);
				}
				return;
			}
			case 'nodeUpdate': {
				const [keg] = context as Parameters<ActionMap['nodeUpdate']>;
				const hooks = this.actionMap.nodeUpdate;
				for (const hook of hooks) {
					await hook(keg);
				}
				return;
			}
			case 'nodeDelete': {
				const [] = context as Parameters<ActionMap['nodeDelete']>;
				const hooks = this.actionMap.nodeDelete;
				for (const hook of hooks) {
					await hook({});
				}
				return;
			}
			case 'search': {
				const [ctx] = context as Parameters<ActionMap['search']>;
				const hooks = this.actionMap.search;
				for (const hook of hooks) {
					await hook(ctx);
				}
				return;
			}
			case 'searchAll': {
				const [ctx, search] = context as Parameters<
					ActionMap['searchAll']
				>;
				const hooks = this.actionMap.searchAll;
				for (const hook of hooks) {
					await hook(ctx, search);
				}
				return;
			}
			case 'update': {
				const [ctx] = context as Parameters<ActionMap['update']>;
				const hooks = this.actionMap.update;
				for (const hook of hooks) {
					await hook(ctx);
				}
				return;
			}
			case 'updateAll': {
				const [ctx] = context as Parameters<ActionMap['updateAll']>;
				const hooks = this.actionMap.updateAll;
				for (const hook of hooks) {
					await hook(ctx);
				}
				return;
			}
			default: {
				return absurd(action);
			}
		}
	}

	private filterMap: { [N in ExtensionFilter]: FilterMap[N][] } = {
		searchResults: [],
		searchAllKegs: [],
		searchAllNodes: [],
		initKegs: [],
		searchNodes: [],
		searchAllResults: [],
	};

	addFilter<N extends ExtensionFilter>(name: N, f: FilterMap[N]) {
		this.filterMap[name].push(f);
		return () => {
			const index = this.filterMap[name].findIndex((a) => a === f);
			if (index < 0) {
				return;
			}
			delete this.filterMap[name][index];
		};
	}
}
