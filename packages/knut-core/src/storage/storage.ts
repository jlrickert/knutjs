import { TimeLike } from 'fs';
import { Stringer } from '../utils.js';
import { Optional } from '../internal/optional.js';
import { MyPromise } from '../internal/promise.js';

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

export abstract class GenericStorage {
	constructor(public readonly root: string) {}

	/**
	 * Read a files content if it exists. This updates access time.
	 **/
	abstract read(path: Stringer): MyPromise<Optional<string>>;

	/**
	 * Create or overwrite a file if it exists. Modifies modified time.
	 **/
	abstract write(path: Stringer, contents: Stringer): MyPromise<boolean>;

	/**
	 * Remove a file if it exists
	 **/
	abstract rm(path: Stringer): MyPromise<boolean>;

	/**
	 * Copy over a file or directory. Creates directories if needed. Copies over all contents if it is a directory.
	 **/
	// cp(src: Stringer, dest: Stringer): Promise<boolean>;

	/**
	 * read directory and get all subpaths. The returned paths are all full
	 * paths.
	 */
	abstract readdir(path: Stringer): MyPromise<Optional<string[]>>;

	/**
	 * Remove a directory if it exists
	 **/
	abstract rmdir(
		path: Stringer,
		options?: { recursive?: boolean },
	): MyPromise<boolean>;

	/**
	 * Modify access time, modified time, and/or created time values.
	 **/
	abstract utime(path: string, stats: StorageNodeTime): MyPromise<boolean>;

	/**
	 * Create a directory if it doesn't exist
	 **/
	abstract mkdir(path: Stringer): MyPromise<boolean>;

	/**
	 * Get time stats about a node on the filesystem
	 **/
	abstract stats(path: Stringer): MyPromise<Optional<StorageNodeStats>>;

	/**
	 * Get an underlying reference to the file system that changes the current
	 * working directory
	 **/
	abstract child(subpath: Stringer): GenericStorage;
}
