import { Stringer, currentEnvironment } from '../utils.js';
import { MemoryStorage } from './memoryStorage.js';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage.js';

export class WebStorage implements GenericStorage {
	readonly root: string;
	private prefix: string;
	private storage: MemoryStorage;

	static create(prefix = 'kegfs'): WebStorage {
		if (currentEnvironment !== 'dom') {
			throw new Error('WebStorage not supported');
		}
		const rawData = window.localStorage.getItem(prefix);
		const storage = rawData !== null ? MemoryStorage.parse(rawData) : null;
		if (!storage) {
			return new WebStorage(MemoryStorage.create(), prefix);
		}
		return new WebStorage(storage, prefix);
	}

	private constructor(storage: MemoryStorage, prefix: string) {
		this.root = storage.root;
		this.prefix = prefix;
		this.storage = storage;
	}

	private async save(): Promise<void> {
		const data = this.storage.toJSON();
		window.localStorage.setItem(this.prefix, data);
	}

	async read(filepath: Stringer): Promise<string | null> {
		const content = await this.storage.read(filepath);
		await this.save();
		return content;
	}

	async write(filepath: Stringer, contents: Stringer): Promise<boolean> {
		const result = await this.write(filepath, contents);
		await this.save();
		return result;
	}

	async rm(filepath: Stringer): Promise<boolean> {
		const result = await this.rm(filepath);
		await this.save();
		return result;
	}

	async readdir(dirpath: Stringer): Promise<string[] | null> {
		const result = await this.readdir(dirpath);
		await this.save();
		return result;
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): Promise<boolean> {
		const result = await this.rmdir(filepath, options);
		await this.save();
		return result;
	}

	async utime(path: string, stats: StorageNodeTime): Promise<boolean> {
		const result = await this.utime(path, stats);
		await this.save();
		return result;
	}

	async mkdir(dirpath: Stringer): Promise<boolean> {
		const result = await this.mkdir(dirpath);
		await this.save();
		return result;
	}

	async stats(filepath: Stringer): Promise<StorageNodeStats | null> {
		const result = await this.stats(filepath);
		await this.save();
		return result;
	}

	child(subpath: Stringer): WebStorage {
		const storage = this.storage.child(subpath);
		return new WebStorage(storage, this.prefix);
	}
}
