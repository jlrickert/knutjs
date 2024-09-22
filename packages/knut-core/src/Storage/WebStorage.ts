import { pipe } from 'fp-ts/lib/function.js';
import { MemoryStorage } from './MemoryStorage.js';
import {
	BaseStorage,
	StorageNodeStats,
	StorageNodeTime,
	StorageResult,
} from './BaseStorage.js';
import { currentPlatform, Future, Optional, Stringer } from '../Utils/index.js';

const getWindow = () => {
	if (currentPlatform !== 'dom') {
		throw new Error('WebStorage not supported');
	}
	// @ts-ignore
	return window;
};

export class WebStorage extends BaseStorage {
	public readonly storageType: string = 'Web';
	private prefix: string;
	private storage: MemoryStorage;

	static create(prefix = 'kegfs'): WebStorage {
		const window = getWindow();
		const storage = pipe(
			window.localStorage.getItem(prefix),
			Optional.fromNullable,
			Optional.chain(MemoryStorage.parse),
			Optional.getOrElse(() => MemoryStorage.create()),
		);
		return new WebStorage(storage, prefix);
	}

	private constructor(storage: MemoryStorage, prefix: string) {
		super(storage.uri);
		this.prefix = prefix;
		this.storage = storage;
	}

	private async save(): Future.Future<void> {
		const data = this.storage.toJSON();
		const window = getWindow();
		window.localStorage.setItem(this.prefix, data);
		return Future.of(void {});
	}

	async read(filepath: Stringer): StorageResult<string> {
		const content = await this.storage.read(filepath);
		await this.save();
		return content;
	}

	async write(filepath: Stringer, contents: Stringer): StorageResult<true> {
		const result = await this.storage.write(filepath, contents);
		await this.save();
		return result;
	}

	async rm(filepath: Stringer): StorageResult<true> {
		const result = await this.storage.rm(filepath);
		await this.save();
		return result;
	}

	async readdir(dirpath: Stringer): StorageResult<string[]> {
		const result = await this.storage.readdir(dirpath);
		await this.save();
		return result;
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): StorageResult<true> {
		const result = await this.storage.rmdir(filepath, options);
		await this.save();
		return result;
	}

	async utime(path: string, stats: StorageNodeTime): StorageResult<true> {
		const result = await this.storage.utime(path, stats);
		await this.save();
		return result;
	}

	async mkdir(dirpath: Stringer): StorageResult<true> {
		const result = await this.storage.mkdir(dirpath);
		await this.save();
		return result;
	}

	async stats(filepath: Stringer): StorageResult<StorageNodeStats> {
		const result = await this.storage.stats(filepath);
		await this.save();
		return result;
	}

	child(subpath: Stringer): WebStorage {
		const storage = this.storage.child(subpath);
		return new WebStorage(storage, this.prefix);
	}
}
