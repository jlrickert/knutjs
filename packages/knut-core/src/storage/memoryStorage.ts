import { pipe } from 'fp-ts/lib/function.js';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray.js';
import * as Path from 'path';
import invariant from 'tiny-invariant';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage.js';
import { MyPromise } from '../internal/myPromise.js';
import { Optional, optional } from '../internal/optional.js';
import { Stringer, stringify } from '../utils.js';

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
	nodes: NonEmptyArray<FsNode>;
	index: { [filepath: string]: number };
};

const currentStats = (timestamp?: Date) => {
	const now = stringify(timestamp ?? new Date());
	return {
		atime: now,
		mtime: now,
		btime: now,
		ctime: now,
	} satisfies FsNodeTimestamps;
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

	static async fromStorage(
		storage: GenericStorage,
	): MyPromise<MemoryStorage> {
		const store = MemoryStorage.create();
		storage.overwrite(store);
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
		public readonly root: string,
		private fs: Fs,
	) {
		super(root);
	}

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

	async read(path: Stringer): MyPromise<Optional<string>> {
		const fullpath = this.getFullPath(path);
		const currentTime = stringify(new Date());
		const node = this.getNode(fullpath);
		if (node?.type !== 'file') {
			return optional.none;
		}
		const parentPath = this.getDirpath(fullpath);
		invariant(parentPath, 'Expect valid file to have a parent directory');
		await this.utime(fullpath, { atime: currentTime });
		await this.utime(parentPath, { atime: currentTime });

		return optional.some(node.content);
	}

	async write(path: Stringer, content: Stringer): MyPromise<boolean> {
		const fullpath = this.getFullPath(path);
		const node = this.writeNode(fullpath, stringify(content));
		if (node === null) {
			return false;
		}
		return true;
	}

	async rm(path: Stringer): MyPromise<boolean> {
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
	async readdir(path: Stringer): MyPromise<Optional<string[]>> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (node === null || node.type === 'file') {
			return optional.none;
		}

		const now = new Date();
		await this.utime(path, { atime: now });

		const parentPath = this.getDirpath(fullpath);
		if (parentPath) {
			await this.utime(parentPath, { atime: now });
		}

		return pipe(
			node.children.map((child) => {
				return Path.relative(this.root, child);
			}),
			optional.some,
		);
	}

	async utime(path: Stringer, stats: StorageNodeTime): MyPromise<boolean> {
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

	async mkdir(path: Stringer): MyPromise<boolean> {
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
	): MyPromise<boolean> {
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

	async stats(path: Stringer): MyPromise<Optional<StorageNodeStats>> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (node === null) {
			return optional.none;
		}
		return optional.some({
			...node.stats,
			isFile() {
				return node?.type === 'file';
			},
			isDirectory() {
				return node?.type === 'directory';
			},
		});
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
