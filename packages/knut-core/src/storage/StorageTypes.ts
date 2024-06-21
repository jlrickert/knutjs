import { TimeLike } from 'fs';
import { Stringer } from '../utils.js';
import { Future, Optional } from '../internal/index.js';

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

export interface StorageBaseTrait {
	readonly root: string;
	child(subpath: Stringer): this;
}

export type StorageReadTrait = StorageBaseTrait & {
	/**
	 * Read a files content if it exists. This updates access time.
	 */
	read(path: Stringer): Future.Future<Optional.Optional<string>>;

	/**
	 * read directory and get all subpaths. The returned paths are all full
	 * paths.
	 */
	readdir(
		path: Stringer,
		options?: { recursive?: boolean },
	): Future.Future<Optional.Optional<string[]>>;

	/**
	 * Get time stats about a node on the filesystem
	 */
	stats(path: Stringer): Future.Future<StorageNodeStats>;
};

export type StorageWriteTrait = StorageBaseTrait & {
	/**
	 * Create or overwrite a file if it exists. Modifies modified time.
	 */
	write(
		path: Stringer,
		content: Stringer,
	): Future.Future<Optional.Optional<boolean>>;
	/**
	 * Remove a file if it exists
	 */
	rm(path: Stringer): Future.Future<boolean>;

	/**
	 * Remove a directory if it exists
	 **/
	rmdir(
		path: Stringer,
		options?: { recursive?: boolean },
	): Future.Future<boolean>;
	mkdir(path: Stringer): Future.Future<boolean>;

	/**
	 * Modify access time, modified time, and/or created time values.
	 **/
	utime(path: Stringer, stats: StorageNodeTime): Future.Future<boolean>;
};

export type StorageTrait = StorageBaseTrait &
	StorageReadTrait &
	StorageWriteTrait;

// export abstract class AbstractStorage implements StorageTrait {
// 	constructor(public readonly root: string) {}
//
// 	/**
// 	 * Read a files content if it exists. This updates access time.
// 	 **/
// 	abstract read(path: Stringer): Future.Future<Optional.Optional<string>>;
//
// 	/**
// 	 * Create or overwrite a file if it exists. Modifies modified time.
// 	 **/
// 	abstract write(path: Stringer, contents: Stringer): Future.Future<boolean>;
//
// 	/**
// 	 * Remove a file if it exists
// 	 **/
// 	abstract rm(path: Stringer): Future.Future<boolean>;
//
// 	/**
// 	 * Copy over a file or directory. Creates directories if needed. Copies over all contents if it is a directory.
// 	 **/
// 	// cp(src: Stringer, dest: Stringer): Promise<boolean>;
//
// 	/**
// 	 * read directory and get all subpaths. The returned paths are all full
// 	 * paths.
// 	 */
// 	abstract readdir(
// 		path: Stringer,
// 	): Future.Future<Optional.Optional<string[]>>;
//
// 	/**
// 	 * Remove a directory if it exists
// 	 **/
// 	abstract rmdir(
// 		path: Stringer,
// 		options?: { recursive?: boolean },
// 	): Future.Future<boolean>;
//
// 	/**
// 	 * Modify access time, modified time, and/or created time values.
// 	 **/
// 	abstract utime(path: Stringer, stats: NodeTime): Future.Future<boolean>;
//
// 	/**
// 	 * Create a directory if it doesn't exist
// 	 **/
// 	abstract mkdir(path: Stringer): Future.Future<boolean>;
//
// 	/**
// 	 * Get time stats about a node on the filesystem
// 	 **/
// 	abstract stats(path: Stringer): Future.Future<TOptional<NodeStats>>;
//
// 	/**
// 	 * Get an underlying reference to the file system that changes the current
// 	 * working directory
// 	 **/
// 	abstract child(subpath: Stringer): this;
// }
//
export const createStorage = <N extends string, T extends StorageTrait>(
	storageType: N,
	storage: T,
): T => {
	return {
		kind: storageType,
		...storage,
	} satisfies StorageTrait;
};
