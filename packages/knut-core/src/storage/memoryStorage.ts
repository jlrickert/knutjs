import * as Path from 'path';
import invariant from 'tiny-invariant';
import { Stringer, stringify } from '../utils.js';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage.js';
import { overwrite } from './storageUtils.js';
import { Future } from '../internal/future.js';
import { Optional, optional } from '../internal/optional.js';

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

export class MemoryStorage extends GenericStorage {
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

	static async fromStorage(storage: GenericStorage): Future<MemoryStorage> {
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
		root: string,
		private fs: Fs,
	) {
		super(root);
	}

	/**
	 * Get the full path relative to the root. Normalize the path relative to
	 * the current working directory
	 **/
	private getFullPath(path: Stringer) {
		const fullpath = Path.join(this.root, stringify(path));
		return fullpath;
	}

	private getDirpath(fullpath: string): Optional<string> {
		if (fullpath === '/') {
			return null;
		}
		const dir = Path.dirname(fullpath);
		if (dir === '.') {
			return null;
		}
		return dir;
	}

	private getNode(fullpath: string): Optional<FsNode> {
		const index = this.fs.index[fullpath];
		const node = index !== undefined ? this.fs.nodes[index] : null;
		return node;
	}

	private rebuildIndex(): void {
		this.fs.index = {};
		for (let i = 0; i < this.fs.nodes.length; i++) {
			const { path } = this.fs.nodes[i];
			this.fs.index[path] = i;
		}
	}

	async read(path: Stringer): Future<Optional<string>> {
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

	async write(path: Stringer, content: Stringer): Future<boolean> {
		const fullpath = this.getFullPath(path);
		const nodeStats = await this.stats(fullpath);

		// Write cannot write a file over a directory
		if (nodeStats && nodeStats.isDirectory()) {
			return false;
		}

		const now = new Date();
		const newStats = {
			mtime: stringify(now),
			atime: stringify(nodeStats?.atime ?? now),
			ctime: stringify(nodeStats?.ctime ?? now),
			btime: stringify(nodeStats?.btime ?? now),
		};

		// Actually write the node to the filesystem
		const index = this.fs.nodes.length;
		this.fs.nodes[index] = makeFilenode({
			content: stringify(content),
			path: fullpath,
			stats: newStats,
		});
		this.fs.index[fullpath] = index;

		// Handle the parent node
		const parentPath = this.getDirpath(fullpath);
		invariant(
			parentPath,
			'Expect parent to exist as a node writing to must be a file that is guaranteed be in a directory',
		);
		if (!(await this.mkdir(parentPath))) {
			await this.utime(parentPath, { mtime: newStats.mtime });
		}

		const parent = this.getNode(parentPath);
		invariant(
			parent?.type === 'directory',
			'Expect to retrieve a parent directory after just making it',
		);
		if (!parent.children.includes(fullpath)) {
			parent.children.push(fullpath);
			parent.children.sort();
		}

		return true;
	}

	async rm(path: Stringer): Future<boolean> {
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
	async readdir(path: Stringer): Future<Optional<string[]>> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (node?.type !== 'directory') {
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

	async utime(path: Stringer, stats: StorageNodeTime): Future<boolean> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (!node) {
			return false;
		}

		const prevStats = node.stats;
		const nextStats = {
			mtime: stats.mtime ? stringify(stats.mtime) : prevStats.mtime,
			ctime: stats.ctime ? stringify(stats.ctime) : prevStats.ctime,
			atime: stats.atime ? stringify(stats.atime) : prevStats.atime,
			btime: stats.btime ? stringify(stats.btime) : prevStats.btime,
		};
		node.stats = nextStats;

		return true;
	}

	async mkdir(path: Stringer): Future<boolean> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (node) {
			return false;
		}

		const pathParts = fullpath.split('/').slice(1);
		const dirsToMake = pathParts
			.reduce(
				(acc, part) => {
					const last = acc[acc.length - 1];
					acc.push(Path.join(last, part));
					return acc;
				},
				['/'],
			)
			.reverse();

		// Exit early if there is a conflict
		for (const dirpath of dirsToMake) {
			const node = this.getNode(dirpath);
			if (node?.type === 'file') {
				return false;
			}
		}

		const currentTime = stringify(new Date());
		const newStats = {
			mtime: stringify(currentTime),
			atime: stringify(currentTime),
			ctime: stringify(currentTime),
			btime: stringify(currentTime),
		};

		// Create the new directory node
		const index = this.fs.nodes.length;
		this.fs.nodes[index] = makeDirnode({
			path: fullpath,
			stats: newStats,
			children: [],
		});
		this.fs.index[fullpath] = index;

		const parentPath = this.getDirpath(fullpath);
		invariant(parentPath, 'Expect parent to be non root');

		await this.mkdir(parentPath);
		await this.utime(parentPath, newStats);
		const parent = this.getNode(parentPath);
		invariant(parent?.type === 'directory');
		parent.children.push(fullpath);
		parent.children.sort();

		return true;
	}

	async rmdir(
		path: Stringer,
		options?: { recursive?: boolean },
	): Future<boolean> {
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

	async stats(path: Stringer): Future<Optional<StorageNodeStats>> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (optional.isNone(node)) {
			return optional.none;
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
}
