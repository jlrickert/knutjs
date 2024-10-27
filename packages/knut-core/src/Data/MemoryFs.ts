import invariant from 'tiny-invariant';
import { Store } from '../Store/index.js';
import { Optional, Result } from '../Utils/index.js';
import { Json, JsonError, Path } from './index.js';
import { KnutErrorScope, KnutErrorScopeMap } from './KnutError.js';
import { StorageError } from '../Storage/index.js';

export type FsNodeTimestamps = {
	mtime: string;
	atime: string;
	ctime: string;
	btime: string;
};

export type FsFileNode = {
	type: 'file';
	content: string;
	path: string;
	stats: Store.StoreNodeTime;
};

function makeFilenode({
	content,
	path,
	stats,
}: Omit<FsFileNode, 'type'>): FsFileNode {
	return {
		type: 'file',
		path,
		content,
		stats: { ...stats },
	};
}

export type FsDirNode = {
	type: 'directory';
	path: string;
	children: string[];
	stats: Store.StoreNodeTime;
};

function makeDirnode({
	stats,
	path,
	children,
}: Omit<FsDirNode, 'type'>): FsDirNode {
	return {
		type: 'directory',
		path,
		stats: { ...stats },
		children: [...children],
	};
}

function isDirNode(node: FsNode): node is FsDirNode {
	return node.type === 'directory';
}

function isFilenode(node: FsNode): node is FsFileNode {
	return node.type === 'file';
}

export type FsNode = FsFileNode | FsDirNode;

type Fs = {
	version: '0.1';
	nodes: FsNode[];
	index: { [filepath: string]: number };
};

type MemoryFsResult<T, E extends KnutErrorScope> = Result.Result<
	T,
	KnutErrorScopeMap[E]
>;
export class MemoryFs {
	static parse(content: string): MemoryFsResult<MemoryFs, 'JSON'> {
		const fs = Json.parse<Fs>(content);
		if (Result.isErr(fs)) {
			return Result.err(fs.error);
		}
		switch (fs.value.version) {
			case '0.1': {
				for (let i = 0; i < fs.value.nodes.length; i++) {
					const node = fs.value.nodes[i];
					node.stats = {
						ctime: node.stats.ctime
							? new Date(node.stats.ctime)
							: undefined,
						btime: node.stats.btime
							? new Date(node.stats.btime)
							: undefined,
						atime: node.stats.atime
							? new Date(node.stats.atime)
							: undefined,
						mtime: node.stats.mtime
							? new Date(node.stats.mtime)
							: undefined,
					};
				}
				return Result.ok(new MemoryFs(fs.value));
			}
			default: {
				return Result.err(
					JsonError.makeParseError({
						message: 'Invalid version detected',
					}),
				);
			}
		}
	}

	static empty(root: string, currentTime?: Date) {
		const time = currentTime ?? new Date();
		return new MemoryFs({
			version: '0.1',
			nodes: [
				{
					type: 'directory',
					path: '/',
					stats: {
						atime: time,
						ctime: time,
						mtime: time,
						btime: time,
					},
					children: [],
				},
			],
			index: {
				'/': 0,
			},
		});
	}

	private constructor(private fs: Fs) {}

	stats(path: string): MemoryFsResult<Store.StoreNodeStats, 'STORAGE'> {
		const node = this.getNode(path);
		if (!node) {
			return Result.err(
				StorageError.pathNotFound({ path, storageType: 'MEMORY' }),
			);
		}
		return Result.ok({
			atime: node.stats.atime,
			btime: node.stats.btime,
			ctime: node.stats.ctime,
			mtime: node.stats.mtime,
			isFile() {
				return node.type === 'file';
			},
			isDirectory() {
				return node.type === 'directory';
			},
		});
	}

	read(path: string): MemoryFsResult<string, 'STORAGE'> {
		const node = this.getNode(path);
		if (node && node.type === 'file') {
			node.stats.atime = new Date();
			const parent = Optional.unwrap(
				Optional.fromNullable(this.getNode(Path.dirname(node.path))),
			);
			parent.stats.atime = new Date();
			return Result.ok(node.content);
		}
		return Result.err(
			StorageError.fileNotFound({
				filename: path,
				storageType: 'MEMORY',
			}),
		);
	}

	write(
		path: string,
		content: string,
		options?: { recursive?: boolean; timestamp?: Date },
	): MemoryFsResult<true, 'STORAGE'> {
		const timestamp = options?.timestamp ?? new Date();
		const recursive = options?.recursive ?? true;
		const node = this.getNode(path);
		if (node?.type === 'directory') {
			return Result.err(
				StorageError.dirExists({
					dirname: node.path,
					storageType: 'MEMORY',
				}),
			);
		}
		if (node?.type === 'file') {
			node.content = content;
			node.stats.mtime = timestamp;
			const parent = this.getParent(path);
			invariant(parent?.type === 'directory');
			parent.stats.mtime = timestamp;
			return Result.ok(true);
		}
		let parent = this.getParent(path);
		if (recursive && parent === null) {
			const res = this.mkdir(Path.dirname(Path.resolve('/', path)), {
				recursive,
				timestamp,
			});
			if (Result.isErr(res)) {
				return res;
			}
			parent = this.getParent(path);
			invariant(parent?.type === 'directory');
		}

		if (parent?.type !== 'directory') {
			return Result.err(
				StorageError.pathNotAvailable({
					path,
					storageType: 'MEMORY',
				}),
			);
		}

		this.addNode({
			node: makeFilenode({
				path: Path.resolve('/', path),
				content,
				stats: {
					atime: timestamp,
					mtime: timestamp,
					ctime: timestamp,
					btime: timestamp,
				},
			}),
			timestamp,
		});
		return Result.ok(true);
	}

	rm(
		path: string,
		options?: {
			recursive?: boolean;
			timestamp?: Date;
			rebuildIndex?: false;
		},
	): MemoryFsResult<true, 'STORAGE'> {
		const recursive = options?.recursive ?? false;
		const timestamp = options?.timestamp ?? new Date();
		const rebuildIndex = options?.rebuildIndex ?? true;
		const node = this.getNode(path);
		if (node?.type === 'file') {
			const index = this.fs.index[node.path];
			delete this.fs.nodes[index];
			const parent = this.getParent(path);
			invariant(parent?.type === 'directory');
			parent.stats.mtime = options?.timestamp ?? new Date();
		} else if (recursive && node?.type === 'directory') {
			for (const n of node.children) {
				this.rm(n, { recursive: true, timestamp, rebuildIndex: false });
			}
			const index = this.fs.index[node.path];
			delete this.fs.nodes[index];
			const parent = this.getParent(path);
			invariant(parent?.type === 'directory');
			parent.stats.mtime = options?.timestamp ?? new Date();
		} else if (node?.type === 'directory') {
			return Result.err(
				StorageError.dirExists({
					dirname: node.path,
					message: 'Cannot rm a directory',
					storageType: 'MEMORY',
				}),
			);
		} else {
			return Result.err(
				StorageError.pathNotAvailable({ path, storageType: 'MEMORY' }),
			);
		}
		if (rebuildIndex) {
			this.rebuildIndex();
		}
		return Result.ok(true);
	}

	readdir(path: string): MemoryFsResult<string[], 'STORAGE'> {
		const node = this.getNode(path);
		if (node?.type === 'directory') {
			return Result.ok(node.children);
		} else if (node?.type === 'file') {
			return Result.err(
				StorageError.notADirectory({
					dirname: path,
					storageType: 'MEMORY',
				}),
			);
		}
		return Result.err(
			StorageError.pathNotFound({ path, storageType: 'MEMORY' }),
		);
	}

	rmdir(
		path: string,
		options?: {
			recursive?: boolean;
			timestamp?: Date;
			rebuildIndex?: false;
		},
	): MemoryFsResult<true, 'STORAGE'> {
		const node = this.getNode(path);
		if (node?.type === 'directory' && node.children.length === 0) {
			return this.rm(path);
		}
		if (node?.type === 'directory' && node.children.length > 0) {
			return this.rm(path, { recursive: true });
		}
		if (node?.type === 'file') {
			return Result.err(
				StorageError.notADirectory({
					dirname: path,
					storageType: 'MEMORY',
				}),
			);
		}
		return Result.err(
			StorageError.pathNotFound({ path, storageType: 'MEMORY' }),
		);
	}

	mkdir(
		path: string,
		options?: { recursive?: boolean; timestamp?: Date },
	): MemoryFsResult<true, 'STORAGE'> {
		const timestamp = options?.timestamp ?? new Date();
		const recursive = options?.recursive ?? true;
		const node = this.getNode(path);
		if (node?.type === 'file') {
			return Result.err(
				StorageError.fileExists({
					storageType: 'MEMORY',
					filename: node.path,
				}),
			);
		}
		if (node?.type === 'directory') {
			return Result.err(
				StorageError.dirExists({
					storageType: 'MEMORY',
					dirname: node.path,
				}),
			);
		}

		if (!recursive) {
			const parent = this.getNode(Path.dirname(Path.resolve('/', path)));
			if (parent?.type !== 'directory') {
				return Result.err(
					StorageError.pathNotAvailable({
						path,
						storageType: 'MEMORY',
					}),
				);
			}
			this.addNode({
				node: makeDirnode({
					path: Path.resolve('/', path),
					children: [],
					stats: {
						atime: timestamp,
						btime: timestamp,
						ctime: timestamp,
						mtime: timestamp,
					},
				}),
				timestamp,
			});
			return Result.ok(true);
		}

		if (!this.hasPathAvailable(path)) {
			return Result.err(
				StorageError.pathNotAvailable({ path, storageType: 'MEMORY' }),
			);
		}
		for (const p of this.getPaths(path)) {
			if (this.getNode(p) === null) {
				this.addNode({
					node: makeDirnode({
						path: p,
						children: [],
						stats: {
							atime: timestamp,
							btime: timestamp,
							ctime: timestamp,
							mtime: timestamp,
						},
					}),
					timestamp,
					rebuildIndex: false,
				});
			}
		}
		this.rebuildIndex();
		return Result.ok(true);
	}

	utime(
		path: string,
		stats: Store.StoreNodeTime,
	): MemoryFsResult<true, 'STORAGE'> {
		const node = this.getNode(path);
		if (node) {
			node.stats = { ...node.stats, ...stats };
			return Result.ok(true);
		}
		return Result.err(
			StorageError.pathNotFound({ path, storageType: 'MEMORY' }),
		);
	}

	private getNode(path: string) {
		const resolvedPath = Path.resolve('/', path);
		const index = this.fs.index[resolvedPath];
		const node = index !== undefined ? this.fs.nodes[index] : null;
		return node;
	}

	private rebuildIndex(): void {
		this.fs.index = {};
		this.fs.nodes.sort((a, b) => (a.path < b.path ? -1 : 1));
		for (let i = 0; i < this.fs.nodes.length; i++) {
			const { path } = this.fs.nodes[i];
			this.fs.index[path] = i;
		}
	}

	public toJson(): string {
		return Json.stringify(this.fs as any);
	}

	private hasPathAvailable(path: string): boolean {
		const parts = Path.resolve('/', path).split('/');
		const paths = [];
		let cur = '/';
		for (const part of parts) {
			cur = Path.join(cur, part);
			const node = this.getNode(cur);
			if (node?.type === 'file') {
				return false;
			}
			paths.push(cur);
		}
		return true;
	}

	private getPaths(path: string): string[] {
		const parts = Path.resolve('/', path).split('/');
		const paths = [];
		let cur = '/';
		for (const part of parts) {
			cur = Path.join(cur, part);
			paths.push(cur);
		}
		return paths;
	}

	private addNode(args: {
		node: FsNode;
		timestamp?: Date;
		rebuildIndex?: boolean;
	}) {
		const rebuild = args?.rebuildIndex ?? false;
		const ts = args.timestamp ?? new Date();
		this.fs.index[args.node.path] = this.fs.nodes.length;
		this.fs.nodes[this.fs.nodes.length] = args.node;
		const parent = this.getNode(Path.dirname(args.node.path));
		invariant(parent !== null && isDirNode(parent));
		parent.children.push(args.node.path);
		parent.children.sort();
		parent.stats.mtime = ts;
		if (rebuild) {
			this.rebuildIndex();
		}
	}

	private getParent(path: string) {
		const parent = this.getNode(Path.dirname(Path.resolve('/', path)));
		return parent;
	}
}
