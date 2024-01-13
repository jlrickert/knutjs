import invariant from 'tiny-invariant';
import { Dex } from '../dex.js';
import { KegFile } from '../kegFile.js';
import { Node } from '../node.js';
import { KegStorage, KegFsStats } from './storage.js';
import { Stringer, now } from '../utils.js';
import { SystemStorage } from './systemStorage.js';

export type KegFsNode = {
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

export type MemoryStorageOptions = {};
export class MemoryStorage implements KegStorage {
	private data: KegFs = {
		version: '0.1',
		nodes: [],
		index: {},
	};

	static async copyFrom(
		storage: SystemStorage,
	): Promise<MemoryStorage | null> {
		const memStorage = new MemoryStorage();
		const dex = await Dex.fromStorage(storage);
		const kegFile = await KegFile.load(storage);
		if (kegFile === null || dex === null) {
			return null;
		}
		await memStorage.write(kegFile.getFilepath(), kegFile);

		const nodeIndex = dex.getNodeIndex();
		await memStorage.write(nodeIndex.getFilepath(), nodeIndex);

		const changesIndex = dex.getChangesIndex();
		await memStorage.write(changesIndex.getFilepath(), changesIndex);

		const nodeList = await storage.listNodePaths();
		if (nodeList === null) {
			return null;
		}
		for (const filepath of nodeList) {
			const content = await storage.read(filepath);
			if (content === null) {
				continue;
			}
			await memStorage.write(filepath, content);
		}
		return memStorage;
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
				const nodeId = Node.parseNodeId(filepath);
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

	async write(filepath: string, content: string | Stringer): Promise<void> {
		this.data.index[filepath] = this.data.nodes.length;
		const data =
			typeof content === 'string' ? content : content.stringify();
		this.data.nodes.push({
			content: data,
			stats: { mtime: now('Y-m-D H:M') },
		});
	}

	async stats(filepath: string): Promise<KegFsStats | null> {
		const index = this.data.index[filepath];
		if (index === undefined) {
			return null;
		}
		return this.data.nodes[index].stats ?? null;
	}
}
