import * as Path from 'path';
import { NodeId } from './node.js';
import {
	GenericStorage,
	StorageNodeStats,
	loadStorage,
} from './storage/storage.js';

export const loadKegStorage = (url: string) => {
	if (Path.isAbsolute(url)) {
		const storage = loadStorage(url);
		const kegStorage = KegStorage.fromStorage(storage);
		return kegStorage;
	}
	const storage = loadStorage(url);
	const kegStorage = KegStorage.fromStorage(storage);
	return kegStorage;
};

export class KegStorage {
	static fromStorage(storage: GenericStorage): KegStorage {
		return new KegStorage(storage);
	}

	private constructor(public fs: GenericStorage) {}

	async read(filepath: string): Promise<string | null> {
		return this.fs.read(filepath);
	}

	async write(filepath: string, content: string): Promise<boolean> {
		return this.fs.write(filepath, content);
	}

	async stats(filepath: string): Promise<StorageNodeStats | null> {
		return this.fs.stats(filepath);
	}

	async listNodes(): Promise<NodeId[]> {
		const dirList = await this.fs.readdir('');
		if (!dirList) {
			return [];
		}
		let nodes: NodeId[] = [];
		for (const dir of dirList) {
			const stat = await this.fs.stats(dir);
			const nodeId = NodeId.parsePath(dir);
			if (nodeId && stat?.isDirectory()) {
				nodes.push(nodeId);
			}
		}
		return nodes;
	}

	child(subpath: string): KegStorage {
		return new KegStorage(this.fs.child(subpath));
	}
}
