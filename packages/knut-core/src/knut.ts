import { expect } from 'vitest';
import { ConfigFile } from './configFile.js';
import { DexEntry } from './dex.js';
import { Dex } from './dex.js';
import { Filter } from './filterTypes.js';
import { KegFile, KegFileData } from './kegFile.js';
import { Meta, MetaData } from './metaFile.js';
import { Node, NodeId } from './node.js';
import { Storage, FileSystemStorage } from './storage.js';
import { now } from './utils.js';

export type KegOptions = {
	autoIndex?: boolean;
	/**
	 * Storage or a filesystem path to the keg if a file system is present
	 */
	storage: Storage | string;
};

export type NodeCreateOptions = {
	kegalias: string;
	content: string;
	meta?: MetaData;
	items?: Buffer[];
};

export type NodeReadOptions = {
	kegalias: string;
	nodeId: NodeId;
};

export type NodeUpdateOptions = {
	kegalias: string;
	nodeId: string;
	content?: string;
	meta?: Meta | ((meta: Meta) => void);
};

export type NodeDeleteOptions = {
	kegalias: string;
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
	kegalias: string;
	nodeId: string;
	title: string;
	updated: string;
	rank: number;
};

export type ShareOptions = {
	kegalias: string;
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
	private repoMap = new Map<string, Repo>();

	static async load(options: Record<string, KegOptions>): Promise<Knut> {
		const knut = new Knut();
		if (options) {
			for (const kegAlias in options) {
				const option = options[kegAlias];
				await knut.loadKeg(kegAlias, option);
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
				? new FileSystemStorage({ kegpath: options.storage })
				: options.storage;
		const dex = await Dex.fromStorage(storage);
		const keg = await KegFile.load(storage);
		if (keg === null || dex === null) {
			return;
		}

		this.repoMap.set(kegAlias, { keg: keg, dex: dex, storage });
	}

	async updateConfig(
		kegAlias: string,
		updater: (config: ConfigFile) => void,
	): Promise<void> {}

	async indexUpdate(kegAlias: string): Promise<boolean> {
		return false;
	}

	async nodeCreate(options: NodeCreateOptions): Promise<Node | null> {
		const repo = this.repoMap.get(options.kegalias);
		if (!repo) {
			return null;
		}
		const { keg, dex } = repo;
		const updated = now('Y-m-D H:M');
		repo.keg.update((data) => {
			data.updated = updated;
		});

		const nodeId = keg.getNodeId();
		const node = await Node.fromContent({
			content: options.content,
			updated,
		});
		repo.dex.addNode(nodeId, node);
		return node;
	}

	async nodeRead(options: NodeReadOptions): Promise<Node | null> {
		const repo = this.repoMap.get(options.kegalias);
		if (!repo) {
			return null;
		}
		const { storage } = repo;
		const node = await Node.load(options.nodeId, storage);
		return node;
	}

	async nodeWrite({
		nodeId,
		kegalias,
		content,
		meta,
	}: NodeUpdateOptions): Promise<void> {
		const repo = this.repoMap.get(kegalias);
		if (!repo) {
			return;
		}
		const { storage } = repo;
		const node = await Node.load(new NodeId(nodeId), storage);
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

	async search(
		kegalias: string | string[],
		filter?: Filter<NodeFilterOptions>,
	): Promise<NodeSearchResult[]> {
		const kegs = Array.isArray(kegalias) ? kegalias : [kegalias];
		const results: NodeSearchResult[] = [];
		for (const kegalias of kegs) {
			const repo = this.repoMap.get(kegalias);
			if (!repo) {
				continue;
			}
			const { dex } = repo;
			const entryList = dex.getEntries();
			for (const entry of entryList) {
				results.push({
					nodeId: entry.nodeId.stringify(),
					kegalias,
					rank: -1,
					title: entry.title,
					updated: entry.updated,
				});
			}
		}
		return results;
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
	async share({
		kegalias: kegpath,
		nodeId,
	}: ShareOptions): Promise<string | null> {
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
