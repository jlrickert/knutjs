import * as Path from 'path';
import invariant from 'tiny-invariant';
import { Stringer, stringify } from '../utils.js';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
	overwrite,
} from './storage.js';

type FsNodeTimestamps = {
	mtime: string;
	atime: string;
	ctime: string;
	btime: string;
};

type FsFileNode = {
	type: 'file';
	content: string;
	path: string;
	stats: FsNodeTimestamps;
};

const makeFilenode = ({
	content,
	path,
	stats,
}: Omit<FsFileNode, 'type'>): FsFileNode => ({
	type: 'file',
	path,
	content,
	stats: { ...stats },
});

type FsDirNode = {
	type: 'directory';
	path: string;
	children: string[];
	stats: FsNodeTimestamps;
};

const makeDirnode = ({
	stats,
	path,
	children,
}: Omit<FsDirNode, 'type'>): FsDirNode => ({
	type: 'directory',
	path,
	stats: { ...stats },
	children: [...children],
});

type FsNode = FsFileNode | FsDirNode;

type Fs = {
	version: '0.1';
	nodes: FsNode[];
	index: { [filepath: string]: number };
};

export class MemoryStorage implements GenericStorage {
	static parse(content: string): MemoryStorage | null {
		const fs = JSON.parse(content) as Fs;
		switch (fs.version) {
			case '0.1': {
				return new MemoryStorage('/', fs);
			}
			default: {
				return null;
			}
		}
	}

	static async fromStorage(storage: GenericStorage): Promise<MemoryStorage> {
		const store = MemoryStorage.create();
		await overwrite(storage, store);
		return store;
	}

	/**
	 * Create a new storage in memory.
	 */
	static create(): MemoryStorage {
		const currentTime = stringify(new Date());
		return new MemoryStorage('/', {
			version: '0.1',
			nodes: [
				{
					type: 'directory',
					path: '/',
					stats: {
						atime: stringify(currentTime),
						ctime: stringify(currentTime),
						mtime: stringify(currentTime),
						btime: stringify(currentTime),
					},
					children: [],
				},
			],
			index: {
				'/': 0,
			},
		});
	}

	private constructor(
		readonly root: string,
		private fs: Fs,
	) {}

	/**
	 * Get the full path relative to the root. Normalize the path relative to
	 * the current working directory
	 **/
	private getFullPath(path: Stringer) {
		const p = Path.resolve('/', stringify(path));
		// Need resolve to get rid of the ending / if it exists
		const fullpath = Path.resolve(Path.join(this.root, p));
		return fullpath;
	}

	private getDirpath(fullpath: string): string {
		const dir = Path.dirname(fullpath);
		return dir;
	}

	private getNode(fullpath: string): FsNode | null {
		const index = this.fs.index[fullpath];
		const node = index !== undefined ? this.fs.nodes[index] : null;
		return node;
	}

	private check(fullpath: string) {
		const pathParts = fullpath.split('/').slice(1);
		const dirsToMake = pathParts.reduce<string[]>(
			(acc, part) => {
				const last = acc[acc.length - 1];
				acc.push(Path.join(last, part));
				return acc;
			},
			['/'],
		);

		// Exit early if there is a conflict
		for (const dirpath of dirsToMake) {
			const node = this.getNode(dirpath);
			if (node?.type === 'file') {
				return false;
			}
		}

		return true;
	}

	/**
	 * Assume that a valid path exists
	 **/
	private writeDir(
		fullpath: string,
		stats?: FsNodeTimestamps,
	): FsDirNode | null {
		let node = this.getNode(fullpath);
		if (node?.type === 'directory') {
			return node;
		} else if (node?.type === 'file') {
			return null;
		}

		const now = stringify(new Date());
		const parentPath = this.getDirpath(fullpath);
		const parent = this.writeDir(parentPath);
		if (parent === null) {
			return null;
		}
		parent.stats.mtime = stats?.mtime ?? now;
		parent.children.push(fullpath);

		node = makeDirnode({
			path: fullpath,
			stats: {
				mtime: stats?.mtime ?? now,
				atime: stats?.atime ?? now,
				btime: stats?.btime ?? now,
				ctime: stats?.ctime ?? now,
			},
			children: [],
		});
		const index = this.fs.nodes.length;
		this.fs.nodes[index] = node;
		this.fs.index[fullpath] = index;
		return node;
	}

	/**
	 * Create a new file node.  Assumes that it doesn't exist and a parent
	 * exists.
	 **/
	private writeNode(fullpath: string, content: string): FsFileNode | null {
		const now = stringify(new Date());
		const node = this.getNode(fullpath);
		if (node?.type === 'file') {
			node.content = content;
			node.stats.mtime = now;
			const parentPath = this.getDirpath(fullpath);
			const parent = this.writeDir(parentPath);
			invariant(
				parent?.type === 'directory',
				'Expect parent directory to exist for a file',
			);
			parent.stats.mtime = now;
			return node;
		}

		if (node?.type === 'directory') {
			return null;
		}

		const parentPath = this.getDirpath(fullpath);
		const parent = this.writeDir(parentPath);
		if (parent === null) {
			return null;
		}

		// Create the new directory node
		const newNode = makeFilenode({
			content,
			path: fullpath,
			stats: {
				mtime: now,
				atime: now,
				btime: now,
				ctime: now,
			},
		});
		const index = this.fs.nodes.length;
		this.fs.nodes[index] = newNode;
		this.fs.index[fullpath] = index;
		parent.children.push(fullpath);
		parent.children.sort();
		parent.stats.mtime = now;
		return newNode;
	}

	private rebuildIndex(): void {
		this.fs.index = {};
		for (let i = 0; i < this.fs.nodes.length; i++) {
			const { path } = this.fs.nodes[i];
			this.fs.index[path] = i;
		}
	}

	async read(path: Stringer): Promise<string | null> {
		const fullpath = this.getFullPath(path);
		const currentTime = stringify(new Date());
		const node = this.getNode(fullpath);
		if (node?.type !== 'file') {
			return null;
		}
		const parentPath = this.getDirpath(fullpath);
		invariant(parentPath, 'Expect valid file to have a parent directory');
		await this.utime(fullpath, { atime: currentTime });
		await this.utime(parentPath, { atime: currentTime });

		return node.content;
	}

	async write(path: Stringer, content: Stringer): Promise<boolean> {
		const fullpath = this.getFullPath(path);
		const node = this.writeNode(fullpath, stringify(content));
		if (node === null) {
			return false;
		}
		return true;
	}

	async rm(path: Stringer): Promise<boolean> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (!node || node?.type !== 'file') {
			return false;
		}

		const index = this.fs.index[fullpath];
		if (index === undefined || index === 0) {
			return false;
		}
		delete this.fs.nodes[index];
		this.rebuildIndex();

		const parentPath = this.getDirpath(fullpath);
		const parent = this.getNode(parentPath!);
		const currentTime = new Date();
		await this.utime(parentPath!, { mtime: currentTime });
		invariant(parent?.type === 'directory');
		parent.children = parent.children.filter((child) => child !== fullpath);

		return true;
	}

	/**
	 * Reading a directory updates the atime for both itself and the parent if available
	 **/
	async readdir(path: Stringer): Promise<string[] | null> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (node === null || node.type === 'file') {
			return null;
		}

		const now = new Date();
		await this.utime(path, { atime: now });

		const parentPath = this.getDirpath(fullpath);
		if (parentPath) {
			await this.utime(parentPath, { atime: now });
		}

		return node.children.map((child) => {
			return Path.relative(this.root, child);
		});
	}

	async utime(path: Stringer, stats: StorageNodeTime): Promise<boolean> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (!node) {
			return false;
		}

		const prevStats = node.stats;
		const nextStats = {
			mtime:
				stats.mtime !== undefined
					? stringify(stats.mtime)
					: prevStats.mtime,
			ctime:
				stats.ctime !== undefined
					? stringify(stats.ctime)
					: prevStats.ctime,
			atime:
				stats.atime !== undefined
					? stringify(stats.atime)
					: prevStats.atime,
			btime:
				stats.btime !== undefined
					? stringify(stats.btime)
					: prevStats.btime,
		};
		node.stats = nextStats;

		return true;
	}

	async mkdir(path: Stringer): Promise<boolean> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (
			node?.type === 'directory' ||
			node?.type === 'file' ||
			!this.check(fullpath)
		) {
			return false;
		}

		const pathParts = fullpath.split('/').slice(1);
		const dirsToMake = pathParts.reduce<string[]>(
			(acc, part) => {
				const last = acc[acc.length - 1];
				acc.push(Path.join(last, part));
				return acc;
			},
			['/'],
		);

		for (const dirpath of dirsToMake) {
			this.writeDir(dirpath);
		}

		return true;
	}

	async rmdir(
		path: Stringer,
		options?: { recursive?: boolean },
	): Promise<boolean> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);

		if (node?.type !== 'directory' || node.path === '/') {
			return false;
		}

		// can only delete empty nodes if not recursive
		if (node.children.length !== 0 && !options?.recursive) {
			return false;
		}

		if (options?.recursive) {
			for (let i = 0; i > node.children.length; i++) {
				await this.rmdir(node.children[i]);
			}
		}

		const index = this.fs.index[fullpath];
		delete this.fs.nodes[index];

		const parentPath = this.getDirpath(fullpath);
		invariant(parentPath, 'Expect to exit early if path is not root');
		const parent = this.getNode(parentPath);
		invariant(parent, 'Expect to exit early if path is not root');

		const currentTime = new Date();
		await this.utime(parentPath, { mtime: currentTime });

		this.rebuildIndex();

		return true;
	}

	async stats(path: Stringer): Promise<StorageNodeStats | null> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (node === null) {
			return null;
		}
		return {
			...node.stats,
			isFile() {
				return node?.type === 'file';
			},
			isDirectory() {
				return node?.type === 'directory';
			},
		};
	}

	child(subpath: Stringer): MemoryStorage {
		const storage = new MemoryStorage(
			Path.join(this.root, stringify(subpath)),
			// child needs to reference the data of the parent
			this.fs,
		);
		return storage;
	}

	toJSON(): string {
		return JSON.stringify(this.fs);
	}

	stringify(): string {
		return stringify(this.toJSON());
	}
}
