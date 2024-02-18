import { Optional } from '../internal/optional.js';
import { MyPromise } from '../internal/myPromise.js';
import { Stringer, currentPlatform } from '../utils.js';
import { MemoryStorage } from './memoryStorage.js';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage.js';

export class WebStorage extends GenericStorage {
	private prefix: string;
	private storage: MemoryStorage;

	static create(prefix = 'kegfs'): WebStorage {
		if (currentPlatform !== 'dom') {
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
		super(storage.root);
		this.prefix = prefix;
		this.storage = storage;
	}

	private async save(): MyPromise<void> {
		const data = this.storage.toJSON();
		window.localStorage.setItem(this.prefix, data);
	}

	async read(filepath: Stringer): MyPromise<Optional<string>> {
		const content = await this.storage.read(filepath);
		await this.save();
		return content;
	}

	async write(filepath: Stringer, contents: Stringer): MyPromise<boolean> {
		const result = await this.write(filepath, contents);
		await this.save();
		return result;
	}

	async rm(filepath: Stringer): MyPromise<boolean> {
		const result = await this.rm(filepath);
		await this.save();
		return result;
	}

	async readdir(dirpath: Stringer): MyPromise<Optional<string[]>> {
		const result = await this.readdir(dirpath);
		await this.save();
		return result;
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): MyPromise<boolean> {
		const result = await this.rmdir(filepath, options);
		await this.save();
		return result;
	}

	async utime(path: string, stats: StorageNodeTime): MyPromise<boolean> {
		const result = await this.utime(path, stats);
		await this.save();
		return result;
	}

	async mkdir(dirpath: Stringer): MyPromise<boolean> {
		const result = await this.mkdir(dirpath);
		await this.save();
		return result;
	}

	async stats(filepath: Stringer): MyPromise<Optional<StorageNodeStats>> {
		const result = await this.stats(filepath);
		await this.save();
		return result;
	}

	child(subpath: Stringer): WebStorage {
		const storage = this.storage.child(subpath);
		return new WebStorage(storage, this.prefix);
	}
}
