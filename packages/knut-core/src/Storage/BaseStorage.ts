import { Future, Stringer } from '../Utils/index.js';
import { StorageError } from './StorageError.js';

export type StorageResult<T> = Future.FutureResult<T, StorageError>;

export type StorageNodeTime = {
	/**
	 * modified time
	 **/
	mtime?: Date;

	/**
	 * last accessed time. This is when a file or directory was last read
	 **/
	atime?: Date;

	/**
	 * changed time. This is when metadata is changed
	 */
	ctime?: Date;

	/**
	 * birth time. Time when the file was last created
	 **/
	btime?: Date;
};

export type StorageNodeStats = StorageNodeTime & {
	isDirectory(): boolean;
	isFile(): boolean;
};

export abstract class BaseStorage {
	constructor(public readonly uri: string) {}

	/**
	 * Read a files content if it exists. This updates access time.
	 **/
	abstract read(path: Stringer): StorageResult<string>;

	/**
	 * Create or overwrite a file if it exists. Modifies modified time.
	 **/
	abstract write(path: Stringer, contents: Stringer): StorageResult<true>;

	/**
	 * Remove a file if it exists
	 **/
	abstract rm(path: Stringer): StorageResult<true>;

	/**
	 * Copy over a file or directory. Creates directories if needed. Copies over all contents if it is a directory.
	 **/
	// cp(src: Stringer, dest: Stringer): Promise<boolean>;

	/**
	 * read directory and get all subpaths. The returned paths are all full
	 * paths.
	 */
	abstract readdir(path: Stringer): StorageResult<string[]>;

	/**
	 * Remove a directory if it exists
	 **/
	abstract rmdir(
		path: Stringer,
		options?: { recursive?: boolean },
	): StorageResult<true>;

	/**
	 * Modify access time, modified time, and/or created time values.
	 **/
	abstract utime(path: string, stats: StorageNodeTime): StorageResult<true>;

	/**
	 * Create a directory if it doesn't exist
	 **/
	abstract mkdir(path: Stringer): StorageResult<true>;

	/**
	 * Get time stats about a node on the filesystem
	 **/
	abstract stats(path: Stringer): StorageResult<StorageNodeStats>;

	/**
	 * Get an underlying reference to the file system that changes the current
	 * working directory
	 **/
	abstract child(subpath: Stringer): BaseStorage;
}
