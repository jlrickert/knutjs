import * as Path from 'path';
import { homedir } from 'os';
import * as FS from 'fs/promises';
import { Stringer, stringify } from '../utils.js';
import { KegNode } from '../KegNode.js';
import { Future } from '../internal/future.js';
import {
	StorageTrait,
	StorageNodeStats,
	StorageNodeTime,
	createStorage,
	StorageReadTrait,
} from './StorageTypes.js';
import { Optional } from '../internal/index.js';
import { Store } from 'fp-ts/lib/Store.js';

const parsePath = (path: string): string => {
	return path.replace(/^~/, homedir());
};

const getFullPath = (root: string, path: string): string => {
	const filepath = parsePath(path);
	if (Path.isAbsolute(filepath)) {
		return Path.join(root, filepath);
	}
	const fullpath = Path.resolve(root, filepath);
	return fullpath;
};

export const NodeStorage = (uri: string) => {
	const root = Path.normalize(parsePath(uri));
	let cwd = root;
	const read: StorageReadTrait['read'] = async (path) => {
		const fullpath = getFullPath(root, stringify(path));
		try {
			await FS.readFile(fullpath, { encoding: 'utf-8' });
		} catch (e) {
			return null;
		}
	};
	const readdir: StorageReadTrait['readdir'] = async (path) => {
		const fullpath = getFullPath(root, stringify(path));
	};
	const stats: StorageReadTrait['stats'] = async (path) => {
		const fullpath = getFullPath(root, stringify(path));
	}

	return createStorage('node', {
		root,
		read,
		readdir,
		stats,
	});
};

// export class NodeStorage implements StorageTrait {
// 	public readonly root: string;
// 	constructor(root: string) {
// 		this.root = Path.normalize(parsePath(root));
// 	}
//
// 	private getFullPath(path: Stringer): string {
// 		const filepath = parsePath(path);
// 		if (Path.isAbsolute(filepath)) {
// 			return Path.join(this.root, filepath);
// 		}
// 		const fullpath = Path.resolve(this.root, filepath);
// 		return fullpath;
// 	}
//
// 	private getDirname(fullpath: string): string {
// 		return Path.dirname(fullpath);
// 	}
//
// 	getRoot() {
// 		return this.root;
// 	}
//
// 	async read(filepath: Stringer): Future<Optional.Optional<string>> {
// 		const fullpath = this.getFullPath(parsePath(filepath));
// 		try {
// 			const content = await FS.readFile(fullpath, { encoding: 'utf-8' });
// 			return content;
// 		} catch (error) {
// 			return null;
// 		}
// 	}
//
// 	async write(filepath: Stringer, contents: Stringer): Future<boolean> {
// 		const fullpath = this.getFullPath(filepath);
// 		const content = stringify(contents);
// 		try {
// 			const dirpath = this.getDirname(fullpath);
// 			await FS.mkdir(dirpath, { recursive: true });
// 			await FS.writeFile(fullpath, content, 'utf-8');
// 			return true;
// 		} catch (error) {
// 			return false;
// 		}
// 	}
//
// 	async rm(filepath: Stringer): Future<boolean> {
// 		try {
// 			await FS.rm(this.getFullPath(filepath), { recursive: true });
// 			return true;
// 		} catch (e) {
// 			return false;
// 		}
// 	}
//
// 	async readdir(dirpath: Stringer): Future<Optional.Optional<string[]>> {
// 		const fullPath = this.getFullPath(dirpath);
// 		try {
// 			const children = await FS.readdir(fullPath);
// 			return children
// 				.map((child) => {
// 					return Path.relative(this.root, Path.join(fullPath, child));
// 				})
// 				.sort((a, b) => {
// 					const idA = KegNode.parseNodeId(a);
// 					const idB = KegNode.parseNodeId(b);
// 					if (idA && idB) {
// 						return idA < idB ? -1 : 1;
// 					}
// 					return a < b ? -1 : 1;
// 				});
// 		} catch {
// 			return Optional.none;
// 		}
// 	}
//
// 	async rmdir(
// 		filepath: Stringer,
// 		options?: { recursive?: boolean | undefined } | undefined,
// 	): Future<boolean> {
// 		const fullPath = this.getFullPath(filepath);
// 		try {
// 			await FS.rmdir(fullPath, { recursive: options?.recursive });
// 			return true;
// 		} catch (e) {
// 			return false;
// 		}
// 	}
//
// 	async utime(path: string, stats: NodeStats): Future<boolean> {
// 		const fullpath = this.getFullPath(path);
// 		try {
// 			const s = await FS.stat(fullpath);
// 			const atime = stats.atime !== undefined ? stats.atime : s.atime;
// 			const mtime = stats.mtime !== undefined ? stats.mtime : s.mtime;
// 			await FS.utimes(fullpath, atime, mtime);
// 			return true;
// 		} catch (e) {
// 			return false;
// 		}
// 	}
//
// 	async mkdir(dirpath: Stringer): Future<boolean> {
// 		const fullpath = this.getFullPath(dirpath);
// 		try {
// 			await FS.mkdir(fullpath, {
// 				recursive: true,
// 			});
// 			return true;
// 		} catch (e) {
// 			return false;
// 		}
// 	}
//
// 	async stats(filepath: Stringer): Future<Optional.Optional<NodeStats>> {
// 		const fullpath = this.getFullPath(filepath);
// 		try {
// 			const stats = await FS.stat(fullpath);
// 			return {
// 				atime: stats.atime,
// 				mtime: stats.mtime,
// 				btime: stats.birthtime,
// 				isDirectory() {
// 					return stats.isDirectory();
// 				},
// 				isFile() {
// 					return stats.isFile();
// 				},
// 			};
// 		} catch (e) {
// 			return Optional.none;
// 		}
// 	}
//
// 	child(subpath: Stringer): NodeStorage {
// 		const path = parsePath(subpath);
// 		const storage = new NodeStorage(
// 			Path.isAbsolute(path) ? path : this.getFullPath(path),
// 		);
// 		return storage;
// 	}
// }
