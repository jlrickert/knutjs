import { Stringer } from '../Utils/index.js';
import {
	BaseStorage,
	StorageNodeStats,
	StorageNodeTime,
	StorageResult,
} from './BaseStorage.js';

export class ApiStorage extends BaseStorage {
	constructor(private url: string) {
		super(url);
	}

	async relative(path: string): Promise<string> {
		throw new Error('Method not implemented.');
	}

	async resolve(path: string): Promise<string> {
		throw new Error('Method not implemented.');
	}

	async read(filepath: Stringer): StorageResult<string> {
		throw new Error('Method not implemented.');
	}

	async write(filepath: Stringer, contents: Stringer): StorageResult<true> {
		throw new Error('Method not implemented.');
	}

	async rm(filepath: Stringer): StorageResult<true> {
		throw new Error('Method not implemented.');
	}

	async readdir(dirpath: Stringer): StorageResult<string[]> {
		throw new Error('Method not implemented.');
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): StorageResult<true> {
		throw new Error('Method not implemented.');
	}

	async utime(path: string, stats: StorageNodeTime): StorageResult<true> {
		throw new Error('Method not implemented.');
	}

	async mkdir(dirpath: Stringer): StorageResult<true> {
		throw new Error('Method not implemented.');
	}

	async stats(filepath: Stringer): StorageResult<StorageNodeStats> {
		throw new Error('Method not implemented.');
	}

	child(subpath: Stringer): ApiStorage {
		throw new Error('Method not implemented.');
	}
}
