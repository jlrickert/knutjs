import * as Path from 'path';
import { NodeId } from './node.js';
import { Storage } from './Storage/index.js';
import { Future, Optional, Stringer } from './Utils/index.js';

export const loadKegStorage = (url: string) => {
	if (Path.isAbsolute(url)) {
		const storage = Storage.loadStorage(url);
		const kegStorage = KegStorage.fromStorage(storage);
		return kegStorage;
	}
	const storage = Storage.loadStorage(url);
	const kegStorage = KegStorage.fromStorage(storage);
	return kegStorage;
};

/**
 * KegStorage wraps a generic storage to add additional operations on top of a
 * `GenericStorage`.
 */
export class KegStorage extends Storage.BaseStorage {
	static async kegExists(
		storage: Storage.GenericStorage,
	): Future.Future<boolean> {
		const items = await storage.readdir('');
		return (
			Optional.isSome(items) &&
			items.includes('dex') &&
			items.includes('keg')
		);
	}

	static fromStorage(storage: Storage.GenericStorage): KegStorage {
		if (storage instanceof KegStorage) {
			return storage;
		}
		return new KegStorage(storage);
	}

	private constructor(private fs: Storage.GenericStorage) {
		super(fs.uri);
	}

	read(path: Stringer): Future.OptionalFuture<string> {
		return this.fs.read(path);
	}

	write(path: Stringer, contents: Stringer): Future.Future<boolean> {
		return this.fs.write(path, contents);
	}

	rm(path: Stringer): Future.Future<boolean> {
		return this.fs.rm(path);
	}

	readdir(path: Stringer): Future.OptionalFuture<string[]> {
		return this.fs.readdir(path);
	}

	rmdir(
		path: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): Future.Future<boolean> {
		return this.fs.rmdir(path, options);
	}

	utime(path: string, stats: Storage.StorageNodeTime): Future.Future<boolean> {
		return this.fs.utime(path, stats);
	}

	mkdir(path: Stringer): Future.Future<boolean> {
		return this.fs.mkdir(path);
	}

	stats(path: Stringer): Future.OptionalFuture<Storage.StorageNodeStats> {
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
		return new KegStorage(this.fs.child(subpath));
	}
}
