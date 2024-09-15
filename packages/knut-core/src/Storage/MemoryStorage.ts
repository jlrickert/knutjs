import * as Path from 'path';
import invariant from 'tiny-invariant';
import {
	BaseStorage,
	StorageNodeStats,
	StorageNodeTime,
	StorageResult,
} from './BaseStorage.js';
import {
	Future,
	Optional,
	Result,
	Stringer,
	stringify,
} from '../Utils/index.js';
import { overwrite } from './Storage.js';
import { StorageError } from './index.js';

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

export class MemoryStorage extends BaseStorage {
	static parse(content: string): Optional.Optional<MemoryStorage> {
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
		storage: BaseStorage,
	): Future.Future<MemoryStorage> {
		const store = MemoryStorage.create();
		await overwrite({ source: storage, target: store });
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
		const filepath = stringify(path);
		if (Path.isAbsolute(filepath)) {
			return filepath;
		}
		const fullpath = Path.resolve(this.uri, stringify(path));
		return fullpath;
	}

	private getDirpath(fullpath: string): Optional.Optional<string> {
		if (fullpath === '/') {
			return null;
		}
		const dir = Path.dirname(fullpath);
		if (dir === '.') {
			return null;
		}
		return dir;
	}

	private getNode(fullpath: string): Optional.Optional<FsNode> {
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

	async read(path: Stringer): StorageResult<string> {
		const fullpath = this.getFullPath(path);
		const currentTime = new Date();
		const node = this.getNode(fullpath);
		if (node?.type !== 'file') {
			return Result.err(
				StorageError.fileNotFound({ filename: fullpath }),
			);
		}
		const parentPath = this.getDirpath(fullpath);
		invariant(parentPath, 'Expect valid file to have a parent directory');
		await this.utime(fullpath, { atime: currentTime });
		await this.utime(parentPath, { atime: currentTime });

		return Result.ok(node.content);
	}

	async write(path: Stringer, content: Stringer): StorageResult<true> {
		const fullpath = this.getFullPath(path);
		const nodeStats = await this.stats(fullpath);

		// Write cannot write a file over a directory
		if (Result.isOk(nodeStats) && nodeStats.value.isDirectory()) {
			return Result.err(StorageError.dirNotFound({ dirname: fullpath }));
		}

		// Return appropriate error in the case that there is some other problem.
		if (
			Result.isErr(nodeStats) &&
			nodeStats.error.code !== 'PATH_NOT_FOUND'
		) {
			return Result.err(nodeStats.error);
		}

		const now = new Date();
		const newStats = Result.match(nodeStats, {
			onOk: (a): FsNodeTimestamps => ({
				mtime: stringify(now),
				atime: stringify(a.atime ?? now),
				ctime: stringify(a.ctime ?? now),
				btime: stringify(a.btime ?? now),
			}),
			onErr: (): FsNodeTimestamps => ({
				atime: stringify(now),
				btime: stringify(now),
				ctime: stringify(now),
				mtime: stringify(now),
			}),
		});

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
			Optional.isSome(parentPath),
			'Expect parent to exist as a node writing to must be a file that is guaranteed be in a directory',
		);

		// Update mtime if directory exists
		if (Result.isErr(await this.mkdir(parentPath))) {
			await this.utime(parentPath, { mtime: new Date(newStats.mtime) });
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

		return Result.ok(true);
	}

	async rm(path: Stringer): StorageResult<true> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (Optional.isNone(node)) {
			return Result.err(
				StorageError.fileNotFound({ filename: fullpath }),
			);
		}

		if (node.type === 'directory') {
			return Result.err(
				StorageError.dirExists({
					dirname: fullpath,
					reason: `Cannot remove directory ${fullpath}`,
				}),
			);
		}

		const index = this.fs.index[fullpath];
		if (index === undefined || index === 0) {
			return Result.err(
				StorageError.uknownError({
					message: 'Fatal error',
					reason: 'Retrieving node relies on a index existing',
				}),
			);
		}
		delete this.fs.nodes[index];
		this.rebuildIndex();

		const parentPath = this.getDirpath(fullpath);
		const parent = this.getNode(parentPath!);
		const currentTime = new Date();
		await this.utime(parentPath!, { mtime: currentTime });
		invariant(parent?.type === 'directory');
		parent.children = parent.children.filter((child) => child !== fullpath);

		return Result.ok(true);
	}

	/**
	 * Reading a directory updates the atime for both itself and the parent if available
	 **/
	async readdir(path: Stringer): StorageResult<string[]> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (node?.type !== 'directory') {
			return Result.err(
				StorageError.notADirectory({ dirname: fullpath }),
			);
		}

		const now = new Date();
		await this.utime(path, { atime: now });

		const parentPath = this.getDirpath(fullpath);
		if (parentPath) {
			await this.utime(parentPath, { atime: now });
		}

		const list = node.children.map((child) => {
			return Path.relative(this.uri, child);
		});
		return Result.ok(list);
	}

	async utime(path: Stringer, stats: StorageNodeTime): StorageResult<true> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (Optional.isNone(node)) {
			return Result.err(StorageError.pathNotFound({ path: fullpath }));
		}

		const prevStats = node.stats;
		const nextStats = {
			mtime: stats.mtime ? stringify(stats.mtime) : prevStats.mtime,
			ctime: stats.ctime ? stringify(stats.ctime) : prevStats.ctime,
			atime: stats.atime ? stringify(stats.atime) : prevStats.atime,
			btime: stats.btime ? stringify(stats.btime) : prevStats.btime,
		};
		node.stats = nextStats;

		return Result.ok(true);
	}

	async mkdir(path: Stringer): StorageResult<true> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (node) {
			return Result.err(StorageError.uknownError({ reason: 'Unable ' }));
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
				return Result.err(
					StorageError.fileExists({ filename: dirpath }),
				);
			}
		}

		const currentTime = new Date();
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
		await this.utime(parentPath, {
			ctime: currentTime,
			btime: currentTime,
			atime: currentTime,
			mtime: currentTime,
		});
		const parent = this.getNode(parentPath);
		invariant(parent?.type === 'directory');
		parent.children.push(fullpath);
		parent.children.sort();

		return Result.ok(true);
	}

	async rmdir(
		path: Stringer,
		options?: { recursive?: boolean },
	): StorageResult<true> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (Optional.isNone(node)) {
			return Result.err(StorageError.dirNotFound({ dirname: fullpath }));
		}

		if (node.path === '/') {
			return Result.err(
				StorageError.permissionError({
					filename: '/',
					message: 'Unable to remove root directory',
					reason: 'Unable to remove root directory',
				}),
			);
		}

		if (node?.type !== 'directory') {
			return Result.err(
				StorageError.notADirectory({ dirname: fullpath, reason: '' }),
			);
		}

		// can only delete empty nodes if not recursive
		if (node.children.length !== 0 && !options?.recursive) {
			return Result.err(
				StorageError.dirNotEmpty({
					dirname: fullpath,
				}),
			);
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

		return Result.ok(true);
	}

	async stats(path: Stringer): StorageResult<StorageNodeStats> {
		const fullpath = this.getFullPath(path);
		const node = this.getNode(fullpath);
		if (Optional.isNone(node)) {
			return Result.err(StorageError.pathNotFound({ path: fullpath }));
		}
		return Result.ok({
			...node.stats,
			mtime: new Date(node.stats.mtime),
			atime: new Date(node.stats.atime),
			btime: new Date(node.stats.btime),
			ctime: new Date(node.stats.ctime),
			isFile: () => {
				return node.type === 'file';
			},
			isDirectory: () => {
				return node.type === 'directory';
			},
		});
	}

	child(subpath: Stringer): MemoryStorage {
		const storage = new MemoryStorage(
			Path.join(this.uri, stringify(subpath)),
			// child needs to reference the data of the parent
			this.fs,
		);
		return storage;
	}

	toJSON(): string {
		return JSON.stringify(this.fs);
	}
}
