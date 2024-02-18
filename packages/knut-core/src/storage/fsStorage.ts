import * as Path from 'path';
import { homedir } from 'os';
import * as FS from 'fs/promises';
import { Stringer, stringify } from '../utils.js';
import { NodeId } from '../node.js';
import { MyPromise } from '../internal/myPromise.js';
import { GenericStorage, StorageNodeStats } from './storage.js';
import { Optional, optional } from '../internal/optional.js';

export class FsStorage extends GenericStorage {
	private jail: string;

	constructor(root: string, jail?: string) {
		super(Path.normalize(root.replace(/^~/, homedir())));
		this.jail = jail ?? '/';
	}

	private getAbsolutePath(path: Stringer): string {
		const p = Path.resolve(this.jail, stringify(path));
		const fullpath = Path.resolve(Path.join(this.root, p));
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

	async read(filepath: Stringer): MyPromise<Optional<string>> {
		const fullpath = this.getAbsolutePath(this.parsePath(filepath));
		try {
			const content = await FS.readFile(fullpath, { encoding: 'utf-8' });
			return optional.some(content);
		} catch (error) {
			return optional.none;
		}
	}

	async write(filepath: Stringer, contents: Stringer): MyPromise<boolean> {
		const fullpath = this.getAbsolutePath(filepath);
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

	async rm(filepath: Stringer): MyPromise<boolean> {
		try {
			await FS.rm(this.getAbsolutePath(filepath), { recursive: true });
			return true;
		} catch (e) {
			return false;
		}
	}

	async readdir(dirpath: Stringer): MyPromise<Optional<string[]>> {
		const fullPath = this.getAbsolutePath(dirpath);
		const children = await FS.readdir(fullPath);
		const dirs = children
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
		return optional.some(dirs);
	}

	async rmdir(
		filepath: Stringer,
		options?: { recursive?: boolean | undefined } | undefined,
	): MyPromise<boolean> {
		const fullPath = this.getAbsolutePath(filepath);
		try {
			await FS.rmdir(fullPath, { recursive: options?.recursive });
			return true;
		} catch (e) {
			return false;
		}
	}

	async utime(path: string, stats: StorageNodeStats): MyPromise<boolean> {
		const fullpath = this.getAbsolutePath(path);
		try {
			const s = await FS.stat(fullpath);
			const atime = stats.atime !== undefined ? stats.atime : s.atime;
			const mtime = stats.mtime !== undefined ? stats.mtime : s.mtime;
			await FS.utimes(fullpath, new Date(atime), new Date(mtime));
			return true;
		} catch (e) {
			return false;
		}
	}

	async mkdir(dirpath: Stringer): Promise<boolean> {
		const fullpath = this.getAbsolutePath(dirpath);
		try {
			await FS.mkdir(fullpath, {
				recursive: true,
			});
			return true;
		} catch (e) {
			return false;
		}
	}

	async stats(filepath: Stringer): Promise<Optional<StorageNodeStats>> {
		const fullpath = this.getAbsolutePath(filepath);
		try {
			const stats = await FS.stat(fullpath);
			return optional.some({
				atime: stats.atime,
				mtime: stats.mtime,
				btime: stats.birthtime,
				ctime: stats.ctime,
				isDirectory() {
					return stats.isDirectory();
				},
				isFile() {
					return stats.isFile();
				},
			});
		} catch (e) {
			return optional.none;
		}
	}

	child(subpath: Stringer): FsStorage {
		const path = this.parsePath(subpath);
		const storage = new FsStorage(
			Path.isAbsolute(path) ? path : Path.resolve(this.root, path),
			this.jail,
		);
		return storage;
	}
}
