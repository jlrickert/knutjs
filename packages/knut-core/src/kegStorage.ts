import { NodeId } from './node.js';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage/storage.js';
import { MyPromise } from './internal/myPromise.js';
import { Stringer } from './utils.js';
import { pipe } from 'fp-ts/lib/function.js';
import { fromUri } from './storage/storageUtils.js';
import { Optional, optional } from './internal/optional.js';

export class KegStorage extends GenericStorage {
	static fromURI(uri: string): Optional<KegStorage> {
		return pipe(uri, fromUri, optional.map(KegStorage.create));
	}

	static fromStorage(storage: GenericStorage): KegStorage {
		return new KegStorage(storage);
	}

	static create(fs: GenericStorage) {
		return new KegStorage(fs);
	}

	private constructor(private fs: GenericStorage) {
		super(fs.root);
	}

	rm(path: Stringer): MyPromise<boolean> {
		return this.fs.rm(path);
	}
	mkdir(path: Stringer): MyPromise<boolean> {
		return this.fs.mkdir(path);
	}
	readdir(path: Stringer): MyPromise<Optional<string[]>> {
		return this.readdir(path);
	}
	rmdir(
		path: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): MyPromise<boolean> {
		return this.fs.rmdir(path, options);
	}
	utime(path: Stringer, stats: StorageNodeTime): MyPromise<boolean> {
		return this.fs.utime(path, stats);
	}
	read(path: Stringer): MyPromise<Optional<string>> {
		return this.fs.read(path);
	}
	write(path: Stringer, contents: Stringer): MyPromise<boolean> {
		return this.fs.write(path, contents);
	}
	stats(path: Stringer): MyPromise<Optional<StorageNodeStats>> {
		return this.fs.stats(path);
	}

	async *listNodes() {
		const dirList = await this.fs.readdir('');
		if (optional.isNone(dirList)) {
			return [];
		}
		let nodes: NodeId[] = [];
		for (const dir of dirList) {
			const stat = await this.fs.stats(dir);
			// FIXME(jared): something tells me this will pick up some thing
			// strange like dex/some/wierd/dex/numbered/234/file.
			const nodeId = NodeId.parsePath(dir);
			if (nodeId && optional.isSome(stat) && stat?.isDirectory()) {
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
