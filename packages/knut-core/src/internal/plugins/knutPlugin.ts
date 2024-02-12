import { Knut } from '../../knut.js';
import { IndexPlugin } from './indexPlugin.js';
import { SearchPlugin } from './searchPlugin.js';

export type KnutPluginContext = {
	knut: Knut;
	getIndexList(): Promise<string[]>;
	/**
	 * registerIndex registers an index function on the keg. A search is
	 * automatically deactivated with disabling a plugin.
	 **/
	registerIndex(plug: IndexPlugin): Promise<void>;

	/**
	 * Remove an index.  This may remove an index function created by other
	 * plugins.
	 **/
	degregisterIndex(name: string): Promise<void>;

	getSearchList(): Promise<string[]>;
	/**
	 * registerSearch registers a search function on the keg. A search is
	 * automatically deactivated with disabling a plugin.
	 **/
	registerSearch(plug: SearchPlugin): Promise<void>;

	/**
	 * Remove a search.  This may remove a search function created by other
	 * plugins.
	 **/
	degregisterSearch(name: string): Promise<void>;
};

export type KnutPlugin = {
	readonly name: string;
	readonly depends?: string[];
	readonly summary?: string;
	activate(ctx: KnutPluginContext): Promise<void>;
	deactivate?(ctx: KnutPluginContext): Promise<void>;
};
