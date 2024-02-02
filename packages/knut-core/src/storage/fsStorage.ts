import * as Path from 'path';
import { homedir } from 'os';
import * as FS from 'fs/promises';
import { Stringer, stringify } from '../utils.js';
import { NodeId } from '../node.js';
import { GenericStorage, StorageNodeStats } from './storage.js';

export class FsStorage implements GenericStorage {
	private root: string;
	constructor(root: string) {
		this.root = Path.normalize(this.parsePath(root));
	}

	private getFullPath(path: Stringer): string {
		const filepath = this.parsePath(path);
		if (Path.isAbsolute(filepath)) {
			return Path.join(this.root, filepath);
		}
		const fullpath = Path.resolve(this.root, filepath);
		return fullpath;
	}

	private getDirname(fullpath: string): string {
		return Path.dirname(fullpath);
	}

	private parsePath(path: Stringer): string {
		return stringify(path).replace(/^~/, homedir());
	}

	getRoot() {
		return this.root;
	}

	async read(filepath: Stringer): Promise<string | null> {
		const fullpath = this.getFullPath(this.parsePath(filepath));
		try {
			const content = await FS.readFile(fullpath, { encoding: 'utf-8' });
			return content;
		} catch (error) {
			return null;
		}
	}

	async write(filepath: Stringer, contents: Stringer): Promise<boolean> {
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

	async rm(filepath: Stringer): Promise<boolean> {
		try {
			await FS.rm(this.getFullPath(filepath), { recursive: true });
			return true;
		} catch (e) {
			return false;
		}
	}

	async readdir(dirpath: Stringer): Promise<string[] | null> {
		const fullPath = this.getFullPath(dirpath);
		const children = await FS.readdir(fullPath);
		return children
			.map((child) => {
				return Path.relative(this.root, Path.join(fullPath, child));
			})
			.sort((a, b) => {
				const idA = NodeId.parsePath(a);
				const idB = NodeId.parsePath(b);
				if (idA && idB) {
					return idA.lt(idB) ? -1 : 1;
				}
				return a < b ? -1 : 1;
			});
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): Promise<boolean> {
		const fullPath = this.getFullPath(filepath);
		try {
			await FS.rmdir(fullPath, { recursive: options?.recursive });
			return true;
		} catch (e) {
			return false;
		}
	}

	async utime(path: string, stats: StorageNodeStats): Promise<boolean> {
		const fullpath = this.getFullPath(path);
		try {
			const s = await FS.stat(fullpath);
			const atime =
				stats.atime !== undefined ? stringify(stats.atime) : s.atime;
			const mtime =
				stats.mtime !== undefined ? stringify(stats.mtime) : s.mtime;
			await FS.utimes(fullpath, atime, mtime);
			return true;
		} catch (e) {
			return false;
		}
	}

	async mkdir(dirpath: Stringer): Promise<boolean> {
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

	async stats(filepath: Stringer): Promise<StorageNodeStats | null> {
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
			return null;
		}
	}

	child(subpath: Stringer): FsStorage {
		const path = this.parsePath(subpath);
		const storage = new FsStorage(
			Path.isAbsolute(path) ? path : this.getFullPath(path),
		);
		return storage;
	}
}
