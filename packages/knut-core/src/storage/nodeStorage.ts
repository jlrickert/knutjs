import * as Path from 'path';
import { homedir } from 'os';
import * as FS from 'fs/promises';
import { NodeId } from '../node.js';
import { BaseStorage, StorageNodeStats } from './BaseStorage.js';
import { Future, Optional, Stringer, stringify } from '../Utils/index.js';

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

	async read(filepath: Stringer): Future.OptionalFuture<string> {
		const fullpath = this.getFullPath(NodeStorage.parsePath(filepath));
		try {
			const content = await FS.readFile(fullpath, { encoding: 'utf-8' });
			return content;
		} catch (error) {
			return null;
		}
	}

	async write(filepath: Stringer, contents: Stringer): Future.Future<boolean> {
		const fullpath = this.getFullPath(filepath);
		const content = stringify(contents);
		try {
			const dirpath = this.getDirname(fullpath);
			await FS.mkdir(dirpath, { recursive: true });
			await FS.writeFile(fullpath, content, 'utf-8');
			return true;
		} catch (error) {
			return false;
		}
	}

	async rm(filepath: Stringer): Future.Future<boolean> {
		try {
			await FS.rm(this.getFullPath(filepath), { recursive: true });
			return true;
		} catch (e) {
			return false;
		}
	}

	async readdir(dirpath: Stringer): Future.OptionalFuture<string[]> {
		const fullPath = this.getFullPath(dirpath);
		try {
			const children = await FS.readdir(fullPath);
			return children
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
		} catch {
			return Optional.none;
		}
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): Future.Future<boolean> {
		const fullPath = this.getFullPath(filepath);
		try {
			await FS.rmdir(fullPath, { recursive: options?.recursive });
			return true;
		} catch (e) {
			return false;
		}
	}

	async utime(path: string, stats: StorageNodeStats): Future.Future<boolean> {
		const fullpath = this.getFullPath(path);
		try {
			const s = await FS.stat(fullpath);
			const atime = stats.atime !== undefined ? stats.atime : s.atime;
			const mtime = stats.mtime !== undefined ? stats.mtime : s.mtime;
			await FS.utimes(fullpath, atime, mtime);
			return true;
		} catch (e) {
			return false;
		}
	}

	async mkdir(dirpath: Stringer): Future.Future<boolean> {
		const fullpath = this.getFullPath(dirpath);
		try {
			await FS.mkdir(fullpath, {
				recursive: true,
			});
			return true;
		} catch (e) {
			return false;
		}
	}

	async stats(filepath: Stringer): Future.OptionalFuture<StorageNodeStats> {
		const fullpath = this.getFullPath(filepath);
		try {
			const stats = await FS.stat(fullpath);
			return {
				atime: stats.atime,
				mtime: stats.mtime,
				btime: stats.birthtime,
				isDirectory() {
					return stats.isDirectory();
				},
				isFile() {
					return stats.isFile();
				},
			};
		} catch (e) {
			return Optional.none;
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
