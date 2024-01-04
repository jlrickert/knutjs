import { Config } from './config.js';
import { DexEntry } from './dex.js';
import { Dex } from './dex.js';
import { Filter } from './filterTypes.js';
import { KegFile, KegFileData } from './kegFile.js';
import { Meta, MetaData } from './meta.js';
import { Node, NodeId } from './node.js';
import { Storage, SystemStorage } from './storage.js';
import { now } from './utils.js';

export type KegOptions = {
	autoIndex?: boolean;
	storage: Storage | string;
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
	meta?: Meta | ((meta: Meta) => void);
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
	meta: Meta;
};

export type NodeSearchResult = {
	kegpath: string;
	nodeId: string;
	title: string;
	updated: string;
	rank: number;
};

export type ShareOptions = {
	kegpath: string;
	nodeId: NodeId;
};

type PublishOptions = {
	target: 'git' | 'mkdocs' | 'knut';
};

export type SearchStrategy = 'classic' | 'semantic';

type Repo = {
	keg: KegFile;
	dex: Dex;
	storage: Storage;
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
	//
	private repoMap = new Map<string, Repo>();

	static load(options: Record<string, KegOptions>): Knut {
		const knut = new Knut();
		if (options) {
			for (const kegAlias in options) {
				const o = options[kegAlias];
				knut.loadKeg(kegAlias, o);
			}
		}
		return knut;
	}

	constructor() {}

	/**
	 * Loads required data for a keg
	 */
	async loadKeg(kegAlias: string, options: KegOptions): Promise<void> {
		const storage =
			typeof options.storage === 'string'
				? new SystemStorage({ kegpath: options.storage })
				: options.storage;
		const dex = await Dex.load(storage);
		const keg = await KegFile.load(storage);
		if (keg !== null && dex !== null) {
			this.repoMap.set(kegAlias, { keg, dex, storage });
			console.log({ message: 'after', keg, dex, repoMap: this.repoMap });
		}
	}

	async updateConfig(
		kegAlias: string,
		updater: (config: Config) => void,
	): Promise<void> {}

	async indexUpdate(kegAlias: string): Promise<boolean> {
		return false;
	}

	async nodeCreate(options: NodeCreateOptions): Promise<Node | null> {
		const repo = this.repoMap.get(options.kegpath);
		if (!repo) {
			return null;
		}
		const { keg, dex } = repo;
		const updated = now('Y-m-D H:M');
		repo.keg.update((data) => {
			data.updated = updated;
		});

		const nodeId = keg.getNodeId();
		const node = new Node({
			content: '',
			meta: new Meta(),
			updated: updated,
		});
		repo.dex.addNode({ nodeId, title: '', updated });
		return node;
	}

	async nodeRead(options: NodeReadOptions): Promise<Node | null> {
		const repo = this.repoMap.get(options.kegpath);
		if (!repo) {
			return null;
		}
		const { storage } = repo;
		const node = await Node.load(options.nodeId, storage);
		return node;
	}

	async nodeUpdate({
		nodeId,
		kegpath,
		content,
		meta,
	}: NodeUpdateOptions): Promise<void> {
		const repo = this.repoMap.get(kegpath);
		if (!repo) {
			return;
		}
		const { storage } = repo;
		const node = await Node.load(nodeId, storage);
		if (!node) {
			return;
		}
		if (content) {
			node.updateContent(content);
		}
		if (meta) {
			node.updateMeta(meta);
		}
	}

	async nodeList(
		kegpath: string,
		filter?: Filter<DexEntry>,
	): Promise<DexEntry[] | null> {
		const repo = this.repoMap.get(kegpath);
		if (!repo) {
			return null;
		}
		const dex = repo.dex;
		return [...dex.getNodes()];
	}

	async search(
		kegpath: string | string[],
		filter?: Filter<NodeFilterOptions>,
	): Promise<NodeSearchResult[]> {
		if (Array.isArray(kegpath)) {
			return [];
		}
		const repo = this.repoMap.get(kegpath);
		console.log({ message: 'HERE', repo });
		if (!repo) {
			return [];
		}
		const { keg, storage } = repo;
		console.log({ keg, storage });
		return [];
	}

	async setConfig(
		kegpath: string,
		config: Partial<KegFileData>,
	): Promise<void> {
		const repo = this.repoMap.get(kegpath);
		if (!repo) {
			return;
		}
		const { keg, storage } = repo;
		keg.update((data) => {
			for (const key in config) {
				if (config.hasOwnProperty(key)) {
					const element = (config as any)[key];
					(data as any)[key] = element;
				}
			}
		});
		storage.write('keg', keg.toYAML());
	}

	/**
	 * Export keg to an external source. This could be with git.
	 */
	async publish(kegpath: string, options?: PublishOptions): Promise<void> {}

	/**
	 * Share a specific shareable node by providing a link.
	 */
	async share({ kegpath, nodeId }: ShareOptions): Promise<string | null> {
		const repo = this.repoMap.get(kegpath);
		if (!repo) {
			return null;
		}
		const { keg, storage } = repo;
		const link = keg.getLink(nodeId);
		const node = await Node.load(nodeId, storage);
		return link;
	}

	/**
	 * Remove access to a node
	 **/
	async unshare(options: ShareOptions): Promise<void> {}

	/**
	 * import nodes from another keg. Used for combining multiple kegs into 1.
	 */
	async merge(from: string | string[], to: string): Promise<void> {}

	getKeg(kegpath: string): KegFile | null {
		const repo = this.repoMap.get(kegpath);
		return repo?.keg ?? null;
	}

	getDex(kegpath: string): Dex | null {
		const repo = this.repoMap.get(kegpath);
		return repo?.dex ?? null;
	}
}
