import { TimeLike } from 'fs';
import { Future, Stringer } from '../Utils/index.js';

export type StorageNodeTime = {
	/**
	 * modified time
	 **/
	mtime?: TimeLike;

	/**
	 * last accessed time. This is when a file or directory was last read
	 **/
	atime?: TimeLike;

	/**
	 * changed time. This is when metadata is changed
	 */
	ctime?: TimeLike;

	/**
	 * birth time. Time when the file was last created
	 **/
	btime?: TimeLike;
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
	abstract read(path: Stringer): Future.OptionalFuture<string>;

	/**
	 * Create or overwrite a file if it exists. Modifies modified time.
	 **/
	abstract write(path: Stringer, contents: Stringer): Future.Future<boolean>;

	/**
	 * Remove a file if it exists
	 **/
	abstract rm(path: Stringer): Future.Future<boolean>;

	/**
	 * Copy over a file or directory. Creates directories if needed. Copies over all contents if it is a directory.
	 **/
	// cp(src: Stringer, dest: Stringer): Promise<boolean>;

	/**
	 * read directory and get all subpaths. The returned paths are all full
	 * paths.
	 */
	abstract readdir(path: Stringer): Future.OptionalFuture<string[]>;

	/**
	 * Remove a directory if it exists
	 **/
	abstract rmdir(
		path: Stringer,
		options?: { recursive?: boolean },
	): Future.Future<boolean>;

	/**
	 * Modify access time, modified time, and/or created time values.
	 **/
	abstract utime(
		path: string,
		stats: StorageNodeTime,
	): Future.Future<boolean>;

	/**
	 * Create a directory if it doesn't exist
	 **/
	abstract mkdir(path: Stringer): Future.Future<boolean>;

	/**
	 * Get time stats about a node on the filesystem
	 **/
	abstract stats(path: Stringer): Future.OptionalFuture<StorageNodeStats>;

	/**
	 * Get an underlying reference to the file system that changes the current
	 * working directory
	 **/
	abstract child(subpath: Stringer): BaseStorage;
}

