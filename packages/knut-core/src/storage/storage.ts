import { TimeLike } from 'fs';
import { Stringer, currentEnvironment } from '../utils.js';
import { ApiStorage } from './apiStorage.js';
import { WebStorage } from './webStorage.js';
import { FsStorage } from './fsStorage.js';
import { MemoryStorage } from './memoryStorage.js';
import invariant from 'tiny-invariant';

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
	readonly root: string;
	/**
	 * Read a files content if it exists. This updates access time.
	 **/
	read(path: Stringer): Promise<string | null>;

	/**
	 * Create or overwrite a file if it exists. Modifies modified time.
	 **/
	write(path: Stringer, contents: Stringer): Promise<boolean>;

	/**
	 * Remove a file if it exists
	 **/
	rm(path: Stringer): Promise<boolean>;

	/**
	 * Copy over a file or directory. Creates directories if needed. Copies over all contents if it is a directory.
	 **/
	// cp(src: Stringer, dest: Stringer): Promise<boolean>;

	/**
	 * read directory and get all subpaths. The returned paths are all full
	 * paths.
	 */
	readdir(path: Stringer): Promise<string[] | null>;

	/**
	 * Remove a directory if it exists
	 **/
	rmdir(path: Stringer, options?: { recursive?: boolean }): Promise<boolean>;

	/**
	 * Modify access time, modified time, and/or created time values.
	 **/
	utime(path: string, stats: StorageNodeTime): Promise<boolean>;

	/**
	 * Create a directory if it doesn't exist
	 **/
	mkdir(path: Stringer): Promise<boolean>;

	/**
	 * Get time stats about a node on the filesystem
	 **/
	stats(path: Stringer): Promise<StorageNodeStats | null>;

	/**
	 * Get an underlying reference to the file system that changes the current
	 * working directory
	 **/
	child(subpath: Stringer): GenericStorage;
};

export const loadStorage = (path: string): GenericStorage => {
	if (path.match(/^https?/)) {
		const storage = new ApiStorage(path);
		return storage;
	}
	switch (currentEnvironment) {
		case 'dom': {
			const storage = WebStorage.create();
			return storage.child(path);
		}
		case 'node': {
			const storage = new FsStorage(path);
			return storage;
		}
		default: {
			const storage = MemoryStorage.create();
			return storage;
		}
	}
};

export const walk = async (
	storage: GenericStorage,
	f: (dirs: string[], files: string[]) => void,
): Promise<void> => {
	const item = storage.readdir('/');
};

/**
 * copy over all contents from the source to the destination.
 */
export const overwrite = async (src: GenericStorage, dest: GenericStorage) => {
	const pathList = await src.readdir('');
	if (!pathList) {
		return;
	}
	for (const path of pathList) {
		const stats = await src.stats(path);
		invariant(stats, 'Expect readdir to only list items that exist');
		if (stats.isDirectory()) {
			await dest.mkdir(path);
			await overwrite(src.child(path), dest.child(path));
		} else if (stats.isFile()) {
			const content = await src.read(path);
			invariant(content, 'Expect readdir to list a valid file');
			await dest.write(path, content);
		} else {
			throw new Error('Unhandled node type');
		}
	}
};

/**
 * Makes the destination look like the source
 */
export const archive = async (src: GenericStorage, dest: GenericStorage) => {};
