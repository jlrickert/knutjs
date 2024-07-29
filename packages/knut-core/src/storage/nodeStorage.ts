import * as Path from 'path';
import { homedir } from 'os';
import * as FS from 'fs/promises';
import { NodeId } from '../node.js';
import { BaseStorage, StorageNodeStats, StorageResult } from './BaseStorage.js';
import { Result, Stringer, stringify } from '../Utils/index.js';
import { uknownError } from './Storage.js';

export class NodeStorage extends BaseStorage {
	private static parsePath(path: Stringer): string {
		return stringify(path).replace(/^~/, homedir());
	}

	constructor(root: string) {
		super(Path.normalize(NodeStorage.parsePath(root)));
	}

	private getFullPath(path: Stringer): string {
		const filepath = NodeStorage.parsePath(path);
		if (Path.isAbsolute(filepath)) {
			return Path.join(this.uri, filepath);
		}
		const fullpath = Path.resolve(this.uri, filepath);
		return fullpath;
	}

	private getDirname(fullpath: string): string {
		return Path.dirname(fullpath);
	}

	getRoot() {
		return this.uri;
	}

	async read(filepath: Stringer): StorageResult<string> {
		const fullpath = this.getFullPath(NodeStorage.parsePath(filepath));
		try {
			const content = await FS.readFile(fullpath, { encoding: 'utf-8' });
			return Result.ok(content);
		} catch (error) {
			return Result.err(
				uknownError({
					reason: `Unable to read file "${fullpath}"`,
					error,
				}),
			);
		}
	}

	async write(filepath: Stringer, contents: Stringer): StorageResult<true> {
		const fullpath = this.getFullPath(filepath);
		const content = stringify(contents);
		try {
			const dirpath = this.getDirname(fullpath);
			await FS.mkdir(dirpath, { recursive: true });
			await FS.writeFile(fullpath, content, 'utf-8');
			return Result.ok(true);
		} catch (error) {
			return Result.err(
				uknownError({
					reason: `Unable to write to file ${fullpath}`,
					error,
				}),
			);
		}
	}

	async rm(filepath: Stringer): StorageResult<true> {
		try {
			await FS.rm(this.getFullPath(filepath), { recursive: true });
			return Result.ok(true);
		} catch (error) {
			return Result.err(
				uknownError({
					reason: `Unable to remove file ${stringify(filepath)}`,
					error,
				}),
			);
		}
	}

	async readdir(dirpath: Stringer): StorageResult<string[]> {
		const fullPath = this.getFullPath(dirpath);
		try {
			const children = await FS.readdir(fullPath);
			const list = children
				.map((child) => {
					return Path.relative(this.uri, Path.join(fullPath, child));
				})
				.sort((a, b) => {
					const idA = NodeId.parsePath(a);
					const idB = NodeId.parsePath(b);
					if (idA && idB) {
						return idA.lt(idB) ? -1 : 1;
					}
					return a < b ? -1 : 1;
				});
			return Result.ok(list);
		} catch (error) {
			return Result.err(
				uknownError({
					reason: `unable to read directory "${fullPath}"`,
					error,
				}),
			);
		}
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): StorageResult<true> {
		const fullPath = this.getFullPath(filepath);
		try {
			await FS.rmdir(fullPath, { recursive: options?.recursive });
			return Result.ok(true);
		} catch (error) {
			return Result.err(
				uknownError({
					reason: `unable to rmdir "${fullPath}"`,
					error,
				}),
			);
		}
	}

	async utime(path: string, stats: StorageNodeStats): StorageResult<true> {
		const fullpath = this.getFullPath(path);
		try {
			const s = await FS.stat(fullpath);
			const atime = stats.atime !== undefined ? stats.atime : s.atime;
			const mtime = stats.mtime !== undefined ? stats.mtime : s.mtime;
			await FS.utimes(fullpath, atime, mtime);
			return Result.ok(true);
		} catch (error) {
			return Result.err(
				uknownError({ reason: `unable to utime ${fullpath}`, error }),
			);
		}
	}

	async mkdir(dirpath: Stringer): StorageResult<true> {
		const fullpath = this.getFullPath(dirpath);
		try {
			await FS.mkdir(fullpath, {
				recursive: true,
			});
			return Result.ok(true);
		} catch (error) {
			return Result.err(
				uknownError({
					reason: `unable to mkdir "${fullpath}"`,
					error,
				}),
			);
		}
	}

	async stats(filepath: Stringer): StorageResult<StorageNodeStats> {
		const fullpath = this.getFullPath(filepath);
		try {
			const stats = await FS.stat(fullpath);
			return Result.ok({
				atime: stats.atime,
				mtime: stats.mtime,
				btime: stats.birthtime,
				isDirectory() {
					return stats.isDirectory();
				},
				isFile() {
					return stats.isFile();
				},
			});
		} catch (error) {
			return Result.err(
				uknownError({
					reason: `unable to stat ${filepath}`,
					error,
				}),
			);
		}
	}

	child(subpath: Stringer): NodeStorage {
		const path = NodeStorage.parsePath(subpath);
		const storage = new NodeStorage(
			Path.isAbsolute(path) ? path : this.getFullPath(path),
		);
		return storage;
	}
}
