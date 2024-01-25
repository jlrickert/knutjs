import { TimeLike } from 'fs';
import { Stringer } from '../utils.js';

export type StorageNodeTime = {
	/**
	 * modified time
	 **/
	mtime?: TimeLike;

	/**
	 * last accessed time
	 **/
	atime?: TimeLike;

	/**
	 * time created
	 */
	ctime?: TimeLike;
};

export const makeStorageNodeTime = ({
	atime,
	mtime,
	ctime,
}: Required<StorageNodeTime>): StorageNodeTime => {
	return { ctime, atime, mtime };
};

export type StorageNodeStats = StorageNodeTime & {
	isDirectory(): boolean;
	isFile(): boolean;
};

export type GenericStorage = {
	read(filepath: Stringer): Promise<string | null>;
	write(
		filepath: Stringer,
		contents: Stringer,
		stats?: StorageNodeTime,
	): Promise<void>;
	readdir(dirpath: Stringer): Promise<string[] | null>;
	utime(path: string, stats: StorageNodeTime): Promise<void>;
	mkdir(dirpath: Stringer, stats?: StorageNodeTime): Promise<void>;
	stats(filepath: Stringer): Promise<StorageNodeStats | null>;
	child(subpath: Stringer): GenericStorage;
};

export const walk = async (
	storage: GenericStorage,
	f: (dirs: string[], files: string[]) => void,
): Promise<void> => {
	const item = storage.readdir('/');
};
