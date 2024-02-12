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

	get root() {
		return this.fs.root;
	}

	async read(filepath: string): Promise<string | null> {
		return this.fs.read(filepath);
	}

	async write(filepath: string, content: string): Promise<boolean> {
		return this.fs.write(filepath, content);
	}

	async stats(filepath: string): Promise<StorageNodeStats | null> {
		return this.fs.stats(filepath);
	}

	async *listNodes() {
		const dirList = await this.fs.readdir('');
		if (!dirList) {
			return [];
		}
		let nodes: NodeId[] = [];
		for (const dir of dirList) {
			const stat = await this.fs.stats(dir);
			// FIXME(jared): something tells me this will pick up some thing
			// strange like dex/some/wierd/dex/numbered/234/file.
			const nodeId = NodeId.parsePath(dir);
			if (nodeId && stat?.isDirectory()) {
				yield nodeId;
				nodes.push(nodeId);
			}
		}
		return nodes;
	}

	child(subpath: string): KegStorage {
		return new KegStorage(this.fs.child(subpath));
	}
}
