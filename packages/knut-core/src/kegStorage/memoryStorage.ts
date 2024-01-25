import invariant from 'tiny-invariant';
import { KegNode, NodeId } from '../node.js';
import { KegStorage, StorageNodeStats } from './kegStorage.js';
import { Stringer, now, stringify } from '../utils.js';
import { Keg } from '../keg.js';
import { NodeContent } from '../nodeContent.js';
import { Meta } from '../metaFile.js';

export type KegFsNode = {
	filepath: string;
	content: string;
	stats: {
		mtime: string;
	};
};
export type KegFs = {
	version: '0.1';
	nodes: KegFsNode[];
	index: { [filepath: string]: number };
};

export type KegMemoryStorageOptions = {};
export class KegMemoryStorage implements KegStorage {
	private data: KegFs = {
		version: '0.1',
		nodes: [],
		index: {},
	};

	static async copyFrom(
		storage: KegStorage,
	): Promise<KegMemoryStorage | null> {
		const memStorage = new KegMemoryStorage();
		const keg = await Keg.fromStorage(storage);
		if (keg === null) {
			return null;
		}

		const kegFile = await storage.read('keg');
		if (kegFile) {
			await memStorage.write('keg', kegFile);
		}

		for await (const [, { merge }] of keg.dex.getIndexList()) {
			if (merge) {
				await merge(memStorage);
			}
		}

		for await (const [nodeId, node] of keg.getNodeList()) {
			await memStorage.write(NodeContent.filePath(nodeId), node.content);
			await memStorage.write(Meta.filePath(nodeId), node.meta);
		}

		return memStorage;
	}

	private subpath?: string;

	child(subpath: string | Stringer): KegStorage {
		const storage = new KegMemoryStorage();
		storage.subpath = this.subpath
			? `${this.subpath}/${stringify(subpath)}`
			: stringify(subpath);
		storage.data = this.data;
		return storage;
	}

	async listIndexPaths(): Promise<string[] | null> {
		const paths: string[] = [];
		for (const indexName in this.data.index) {
			if (this.data.index.hasOwnProperty(indexName)) {
				paths.push(`dex/${indexName}`);
			}
		}
		return paths;
	}

	async listNodePaths(): Promise<string[] | null> {
		const keypaths = [];
		for (const filepath in this.data.index) {
			if (this.data.index.hasOwnProperty(filepath)) {
				const nodeId = KegNode.parseNodeId(filepath);
				if (nodeId) {
					keypaths.push(nodeId);
				}
			}
		}
		return keypaths;
	}

	async read(filepath: string): Promise<string | null> {
		const index = this.data.index[filepath];
		if (index === undefined) {
			return null;
		}
		const data = this.data.nodes[index];
		invariant(data, 'Expect to get data when index is defined');
		return data.content;
	}

	async write(
		filepath: string,
		content: string | Stringer,
		stats?: StorageNodeStats,
	): Promise<void> {
		this.data.index[filepath] = this.data.nodes.length;
		const data =
			typeof content === 'string' ? content : content.stringify();
		this.data.nodes.push({
			filepath,
			content: data,
			stats: { mtime: stats?.mtime ?? now('Y-m-D H:M') },
		});
	}

	async stats(filepath: string): Promise<StorageNodeStats | null> {
		const index = this.data.index[filepath];
		if (index === undefined) {
			return null;
		}
		return this.data.nodes[index].stats ?? null;
	}

	async listNodes(): Promise<NodeId[]> {
		const set = new Set<number>();
		for (const filepath in this.data.index) {
			if (this.data.index.hasOwnProperty(filepath)) {
				const [id] = filepath.split('/');
				const nodeId = NodeId.parse(id);
				if (nodeId) {
					set.add(nodeId.id);
				}
			}
		}
		const results = [...set].map((id) => new NodeId(id));
		results.sort((a, b) => (a.gt(b) ? 1 : -1));
		return results;
	}
}
