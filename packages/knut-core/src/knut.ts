import { Config } from './config';
import { Filter } from './filterTypes';
import { Meta, MetaData } from './meta';
import { Node, NodeId } from './node';
import { createId } from './utils';

export type KegOptions = {
	kegs?: string[];
	autoIndex?: boolean;
	nextId?: (ctx: NodeId[]) => NodeId;
	write?: (data: string) => void;
	read?: (filepath: string) => string;
};

export type NodeCreateOptions = {
	kegpath: string;
	content: string;
	meta?: MetaData;
	items?: Buffer[];
};

export type NodeReadOptions = {
	kegpath: string;
	nodeId: NodeId;
};

export type NodeUpdateOptions = {
	kegpath: string;
	nodeId: string;
	content?: string;
	meta?: Meta;
};

export type NodeDeleteOptions = {
	kegpath: string;
	nodeId: NodeId;
};

export type NodeFilterOptions = {
	title: string;
	content: string;
	tags: string[];
	date: string;
	links: string[];
	backlinks: string[];
	frontmater: string;
};

export type NodeSearchResult = {
	kegpath: string;
	nodeId: string;
	rank: number;
};

export type ShareOptions = {
	kegpath: string;
	nodeId: NodeId;
};

type PublishOptions = {
	target: 'git' | 'mkdocs' | 'knut';
};

/**
 * Knut Provides a high level api for managing a keg
 **/
export class Knut {
	// keg: Keg = new Keg({});
	// dex: Dex = new Dex();
	// indexList: IndexEntry[] = [];
	//
	// counter = 0;

	static load(options?: Record<string, KegOptions>): Knut {
		const knut = new Knut();
		if (options) {
			for (const kegpath in options) {
				const o = options[kegpath];
				knut.loadKeg(kegpath, o);
			}
		}
		return knut;
	}

	constructor() {}

	/**
	 * Loads required data for a keg
	 */
	loadKeg(kegpath: string, options?: KegOptions) {}

	updateConfig(kegpath: string, updater: (config: Config) => void) {}

	indexUpdate(kegpath: string): boolean {
		return false;
	}

	nodeCreate(options: NodeCreateOptions): Node {
		const nodeId = createId({ count: 5, postfix: 'A' });
		throw new Error('Not implemented');
	}

	nodeRead(options: NodeReadOptions): Node {
		throw new Error('not implemented');
	}

	nodeUpdate(options: NodeUpdateOptions): Node {
		throw new Error('not implemented');
	}

	nodeDelete(options: NodeDeleteOptions): void {
		throw new Error('not implemented');
	}

	search(
		kegpath: string | string[],
		filter?: Filter<NodeFilterOptions>,
	): NodeSearchResult[] {
		return [];
	}

	/**
	 * Export keg to an external source. This could be with git.
	 */
	publish(kegpath: string, options?: PublishOptions): void {}

	/**
	 * Share a specific shareable node by providing a link.
	 */
	share(options: ShareOptions): string {
		return '';
	}

	/**
	 * Remove access to a node
	 **/
	unshare(options: ShareOptions): void {}

	/**
	 * import nodes from another keg. Used for combining multiple kegs into 1.
	 */
	merge(from: string | string[], to: string): void {}
}
