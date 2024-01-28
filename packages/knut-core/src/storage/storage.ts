import { TimeLike } from 'fs';
import { Stringer } from '../utils.js';

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

export type GenericStorage = {
	/**
	 * Read a files content if it exists. This updates access time.
	 **/
	read(filepath: Stringer): Promise<string | null>;

	/**
	 * Create or overwrite a file if it exists. Modifies modified time.
	 **/
	write(filepath: Stringer, contents: Stringer): Promise<boolean>;

	/**
	 * Remove a file if it exists
	 **/
	rm(filepath: Stringer): Promise<boolean>;

	/**
	 * read directory and get all subpaths. The returned paths are all full
	 * paths.
	 */
	readdir(dirpath: Stringer): Promise<string[] | null>;

	/**
	 * Remove a directory if it exists
	 **/
	rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean },
	): Promise<boolean>;

	/**
	 * Modify access time, modified time, and/or created time values.
	 **/
	utime(path: string, stats: StorageNodeTime): Promise<boolean>;

	/**
	 * Create a directory if it doesn't exist
	 **/
	mkdir(dirpath: Stringer): Promise<boolean>;

	/**
	 * Get time stats about a node on the filesystem
	 **/
	stats(filepath: Stringer): Promise<StorageNodeStats | null>;
	/**
	 * Get an underlying reference to the file system that changes the current
	 * working directory
	 **/
	child(subpath: Stringer): GenericStorage;
};

export const walk = async (
	storage: GenericStorage,
	f: (dirs: string[], files: string[]) => void,
): Promise<void> => {
	const item = storage.readdir('/');
};
