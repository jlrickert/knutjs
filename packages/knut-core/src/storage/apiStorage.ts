import { Stringer } from '../utils.js';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage.js';

export class ApiStorage implements GenericStorage {
	constructor(private url: string) {}

	async resolve(path: string): Promise<string> {
		throw new Error('Method not implemented.');
	}

	async read(filepath: Stringer): Promise<string | null> {
		throw new Error('Method not implemented.');
	}

	async write(filepath: Stringer, contents: Stringer): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	async rm(filepath: Stringer): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	async readdir(dirpath: Stringer): Promise<string[] | null> {
		throw new Error('Method not implemented.');
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	async utime(path: string, stats: StorageNodeTime): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	async mkdir(dirpath: Stringer): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	async stats(filepath: Stringer): Promise<StorageNodeStats | null> {
		throw new Error('Method not implemented.');
	}

	child(subpath: Stringer): ApiStorage {
		throw new Error('Method not implemented.');
	}
}
