import { pipe } from 'fp-ts/lib/function.js';
import { Optional, optional } from '../internal/optional.js';
import { Future, future } from '../internal/future.js';
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
		const storage = pipe(
			window.localStorage.getItem(prefix),
			optional.fromNullable,
			optional.chain(MemoryStorage.parse),
			optional.getOrElse(() => MemoryStorage.create()),
		);
		return new WebStorage(storage, prefix);
	}

	private constructor(storage: MemoryStorage, prefix: string) {
		super(storage.root);
		this.prefix = prefix;
		this.storage = storage;
	}

	private async save(): Future<void> {
		const data = this.storage.toJSON();
		window.localStorage.setItem(this.prefix, data);
		return future.of(void {});
	}

	async read(filepath: Stringer): Future<Optional<string>> {
		const content = await this.storage.read(filepath);
		await this.save();
		return content;
	}

	async write(filepath: Stringer, contents: Stringer): Future<boolean> {
		const result = await this.storage.write(filepath, contents);
		await this.save();
		return result;
	}

	async rm(filepath: Stringer): Future<boolean> {
		const result = await this.storage.rm(filepath);
		await this.save();
		return result;
	}

	async readdir(dirpath: Stringer): Future<Optional<string[]>> {
		const result = await this.storage.readdir(dirpath);
		await this.save();
		return result;
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): Future<boolean> {
		const result = await this.storage.rmdir(filepath, options);
		await this.save();
		return result;
	}

	async utime(path: string, stats: StorageNodeTime): Future<boolean> {
		const result = await this.storage.utime(path, stats);
		await this.save();
		return result;
	}

	async mkdir(dirpath: Stringer): Future<boolean> {
		const result = await this.storage.mkdir(dirpath);
		await this.save();
		return result;
	}

	async stats(filepath: Stringer): Future<Optional<StorageNodeStats>> {
		const result = await this.storage.stats(filepath);
		await this.save();
		return result;
	}

	child(subpath: Stringer): WebStorage {
		const storage = this.storage.child(subpath);
		return new WebStorage(storage, this.prefix);
	}
}
