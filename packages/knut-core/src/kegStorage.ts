import * as Path from 'path';
import { NodeId } from './KegNode.js';
import {
	TStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage/Storage.js';
import { loadStorage } from './storage/storageUtils.js';
import { Stringer } from './utils.js';
import { Future } from './internal/future.js';
import { Optional } from './internal/index.js';

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

/**
 * KegStorage wraps a generic storage to add additional operations on top of a
 * `GenericStorage`.
 */
export class KegStorage extends TStorage {
	static async kegExists(storage: TStorage): Future<boolean> {
		const items = await storage.readdir('');
		return (
			Optional.isSome(items) &&
			items.includes('dex') &&
			items.includes('keg')
		);
	}

	static fromStorage(storage: TStorage): KegStorage {
		if (storage instanceof KegStorage) {
			return storage;
		}
		return new KegStorage(storage);
	}

	private constructor(private fs: TStorage) {
		super(fs.root);
	}

	read(path: Stringer): Future<Optional.Optional<string>> {
		return this.fs.read(path);
	}

	write(path: Stringer, contents: Stringer): Future<boolean> {
		return this.fs.write(path, contents);
	}

	rm(path: Stringer): Future<boolean> {
		return this.fs.rm(path);
	}

	readdir(path: Stringer): Future<Optional.Optional<string[]>> {
		return this.fs.readdir(path);
	}

	rmdir(path: Stringer, options?: { recursive?: boolean }): Future<boolean> {
		return this.fs.rmdir(path, options);
	}

	utime(path: string, stats: StorageNodeTime): Future<boolean> {
		return this.fs.utime(path, stats);
	}

	mkdir(path: Stringer): Future<boolean> {
		return this.fs.mkdir(path);
	}

	stats(path: Stringer): Future<Optional.Optional<StorageNodeStats>> {
		return this.fs.stats(path);
	}

	async *listNodes() {
		const dirList = await this.fs.readdir('');
		if (Optional.isNone(dirList)) {
			return;
		}
		for (const dir of dirList) {
			const stat = await this.fs.stats(dir);
			// FIXME(jared): something tells me this will pick up some thing
			// strange like dex/some/wierd/dex/numbered/234/file.
			const nodeId = NodeId.parsePath(dir);
			if (nodeId && stat?.isDirectory()) {
				yield nodeId;
			}
		}
	}

	child(subpath: string): KegStorage {
		return this;
	}
}
