import { Knut } from '../knut.js';
import { EnvStorage } from '../envStorage.js';
import { KegNode, NodeId } from '../node.js';
import { IndexPluginCreator } from './indexPlugin.js';
import {
	SearchOptions,
	SearchPluginCreator,
	SearchResult,
} from './searchPlugin.js';

export type PluginContext = {
	storage: EnvStorage;
};

export type KnutEvents = {
	preSearch: {
		name: string;
		query: string;
		options: SearchOptions;
		next(options: SearchOptions): Promise<void>;
	};
	postSearch: {
		name: string;
		options: SearchOptions;
		results: SearchResult[];
		next(results: SearchResult[]): Promise<void>;
	};
	preKegPublish: { name: string; kegalias: string };
	postKegPublish: { name: string; kegalias: string };
	preKnutIndex: { name: string };
	postKnutIndex: { name: string };
	preKegIndex: { name: string; kegalias: string };
	postKegIndex: { name: string; kegalias: string };
	preCreateNode: { kegalias: string; nodeId: NodeId; node: KegNode };
	postCreateNode: { kegalias: string; nodeId: NodeId; node: KegNode };
	preModifyNode: { kegalias: string; nodeId: NodeId; node: KegNode };
	postModifyNode: { kegalias: string; nodeId: NodeId; node: KegNode };
	preRemoveNode: { kegalias: string; nodeId: NodeId; node: KegNode };
	postRemoveNode: { kegalias: string; nodeId: NodeId; node: KegNode };
	preImport: { kegs: string[]; to: string };
	postImport: { kegs: string[]; to: string };
};

export type KnutPlugin = {
	name: string;
	indexList: IndexPluginCreator[];
	searchList: SearchPluginCreator[];
};

export type PluginCreatorContext = { knut?: Knut; kegalias?: string[] };
export type PluginCreator = (ctx: PluginCreatorContext) => Promise<KnutPlugin>;
export type DefinePluginArgumentFn = (knut: Knut) => Promise<{
	name: string;
	indexList: IndexPluginCreator[];
	searchList: SearchPluginCreator[];
}>;
export const definePlugin = (creator: PluginCreator): PluginCreator => {
	return creator;
};
