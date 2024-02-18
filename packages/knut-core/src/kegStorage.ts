import * as Path from 'path';
import { NodeId } from './node.js';
import { GenericStorage, StorageNodeStats } from './storage/storage.js';
import { loadStorage } from './storage/storageUtils.js';
import { MyPromise } from './internal/promise.js';
import { Optional } from './internal/optional.js';

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

	async read(filepath: string): MyPromise<Optional<string>> {
		return this.fs.read(filepath);
	}

	async write(filepath: string, content: string): MyPromise<boolean> {
		return this.fs.write(filepath, content);
	}

	async stats(filepath: string): MyPromise<Optional<StorageNodeStats>> {
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
