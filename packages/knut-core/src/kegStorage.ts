import * as Path from 'path';
import { NodeId } from './node.js';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage/storage.js';
import { loadStorage } from './storage/storageUtils.js';
import { Optional, optional } from './internal/optional.js';
import { Stringer } from './utils.js';
import { Future } from './internal/future.js';

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

export class KegStorage extends GenericStorage {
	static async kegExists(storage: GenericStorage): Future<boolean> {
		const items = await storage.readdir('');
		return (
			optional.isSome(items) &&
			items.includes('dex') &&
			items.includes('keg')
		);
	}

	static fromStorage(storage: GenericStorage): KegStorage {
		return new KegStorage(storage);
	}

	private constructor(private fs: GenericStorage) {
		super(fs.root);
	}

	read(path: Stringer): Future<Optional<string>> {
		return this.fs.read(path);
	}

	write(path: Stringer, contents: Stringer): Future<boolean> {
		return this.fs.write(path, contents);
	}

	rm(path: Stringer): Future<boolean> {
		return this.fs.rm(path);
	}

	readdir(path: Stringer): Future<Optional<string[]>> {
		return this.fs.readdir(path);
	}

	rmdir(
		path: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): Future<boolean> {
		return this.fs.rmdir(path, options);
	}

	utime(path: string, stats: StorageNodeTime): Future<boolean> {
		return this.fs.utime(path, stats);
	}

	mkdir(path: Stringer): Future<boolean> {
		return this.fs.mkdir(path);
	}

	stats(path: Stringer): Future<Optional<StorageNodeStats>> {
		return this.fs.stats(path);
	}

	async *listNodes() {
		const dirList = await this.fs.readdir('');
		if (optional.isNone(dirList)) {
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
