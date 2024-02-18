import { Optional } from '../internal/optional.js';
import { MyPromise } from '../internal/myPromise.js';
import { Stringer } from '../utils.js';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage.js';

export class ApiStorage extends GenericStorage {
	constructor(readonly root: string) {
		super(root);
	}

	async relative(path: string): MyPromise<string> {
		throw new Error('Method not implemented.');
	}

	async resolve(path: string): MyPromise<string> {
		throw new Error('Method not implemented.');
	}

	async read(filepath: Stringer): MyPromise<Optional<string>> {
		throw new Error('Method not implemented.');
	}

	async write(filepath: Stringer, contents: Stringer): MyPromise<boolean> {
		throw new Error('Method not implemented.');
	}

	async rm(filepath: Stringer): MyPromise<boolean> {
		throw new Error('Method not implemented.');
	}

	async readdir(dirpath: Stringer): MyPromise<Optional<string[]>> {
		throw new Error('Method not implemented.');
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): MyPromise<boolean> {
		throw new Error('Method not implemented.');
	}

	async utime(path: string, stats: StorageNodeTime): MyPromise<boolean> {
		throw new Error('Method not implemented.');
	}

	async mkdir(dirpath: Stringer): MyPromise<boolean> {
		throw new Error('Method not implemented.');
	}

	async stats(filepath: Stringer): MyPromise<Optional<StorageNodeStats>> {
		throw new Error('Method not implemented.');
	}

	child(subpath: Stringer): ApiStorage {
		throw new Error('Method not implemented.');
	}
}
