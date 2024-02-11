import { EnvStorage } from '../../envStorage.js';
import { Keg } from '../../keg.js';
import { IndexPlugin } from './indexPlugin.js';
import { SearchPlugin } from './searchPlugin.js';

export type KegPluginContext = {
	keg: Keg;
	env: EnvStorage;
	getIndexList(): Promise<string[]>;
	registerIndex(plug: IndexPlugin): Promise<void>;
	degregisterIndex(name: string): Promise<void>;

	getSearchList(): Promise<string[]>;
	registerSearch(plug: SearchPlugin): Promise<void>;
	degregisterSearch(name: string): Promise<void>;
};

export type KegPlugin = {
	readonly name: string;
	readonly depends?: string[];
	readonly summary?: string;
	activate: (ctx: KegPluginContext) => Promise<void>;
	deactivate?: (ctx: KegPluginContext) => Promise<void>;
};
