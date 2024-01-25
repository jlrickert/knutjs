import { Stringer, absurd, now, stringify } from '../utils.js';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage.js';

type FsFileNode = {
	type: 'file';
	content: string;
	stats: {
		mtime: string;
		atime: string;
		ctime: string;
	};
};

const makeFilenode = ({
	content,
	stats,
}: Omit<FsFileNode, 'type'>): FsFileNode => ({
	type: 'file',
	content,
	stats: { ...stats },
});

type FsDirNode = {
	type: 'directory';
	children: string[];
	stats: {
		mtime: string;
		atime: string;
		ctime: string;
	};
};

const makeDirnode = ({
	stats,
	children,
}: Omit<FsDirNode, 'type'>): FsDirNode => ({
	type: 'directory',
	stats: { ...stats },
	children: [...children],
});

type FsNode = FsFileNode | FsDirNode;

const copyNode = (node: FsNode): FsNode => {
	switch (node.type) {
		case 'file': {
			return makeFilenode(node);
		}
		case 'directory': {
			return makeDirnode(node);
		}
		default: {
			return absurd(node);
		}
	}
};

type Fs = {
	version: '0.1';
	nodes: FsNode[];
	index: { [filepath: string]: number };
};

export class MemoryStorage implements GenericStorage {
	static copyFrom(storage: GenericStorage): MemoryStorage {
		if (storage instanceof MemoryStorage) {
			const other = storage.fs;
			const fs: Fs = {
				version: other.version,
				nodes: other.nodes.map(copyNode),
				index: { ...other.index },
			};
			return new MemoryStorage('/', fs);
		}
		const store = MemoryStorage.create();
		throw new Error('Method not implemented.');
	}

	static create(): MemoryStorage {
		const n = stringify(now('Y-m-D H:M'));
		return new MemoryStorage('/', {
			version: '0.1',
			nodes: [
				{
					type: 'directory',
					stats: {
						atime: stringify(n),
						ctime: stringify(n),
						mtime: stringify(n),
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
		private root: string,
		private fs: Fs,
	) {}

	private getFilename(path: Stringer) {
		const fullpath = [this.root, stringify(path)].join('/');
		const parts = fullpath.split('/');
		return parts[parts.length - 1];
	}

	private getDirname(path: Stringer) {
		const fullpath = [this.root, stringify(path)].join('/');
		const parts = fullpath.split('/');
		return parts.slice(0, -1).join('/');
	}

	getNode(path: Stringer): FsNode | null {
		const filepath = this.getFilename(path);
		const index = this.fs.index[filepath];
		const node = index ? this.fs.nodes[index] : null;
		return node;
	}

	async read(path: Stringer): Promise<string | null> {
		// const filepath = this.getFilename(path);
		// const dirpath = this.getDirname(path);
		const currentTime = stringify(Date());
		// const index = this.fs.index[filepath];
		// const node = index ? this.fs.nodes[index] : null;
		const node = this.getNode(path);
		if (node?.type !== 'file') {
			return null;
		}
		await this.utime(path, { atime: currentTime });

		return node.content;
	}

	async write(
		filepath: Stringer,
		contents: Stringer,
		stats?: StorageNodeStats | undefined,
	): Promise<void> {
		const dirname = this.getDirname(filepath);
		const now = new Date();
		const newStats = {
			mtime: stringify(stats?.mtime ?? now),
			atime: stringify(stats?.atime ?? now),
			ctime: stringify(stats?.ctime ?? now),
		};
		const dirNode = this.getNode(dirname);
		if (!dirNode) {
			await this.mkdir(dirname, newStats);
		} else {
			this.utime(dirname, { mtime: newStats.mtime });
		}

		const index =
			this.fs.index[stringify(filepath)] ?? this.fs.nodes.length;
		this.fs.index[stringify(filepath)] = index;

		this.fs.nodes[index] = makeFilenode({
			content: stringify(contents),
			stats: newStats,
		});
	}

	async readdir(dirpath: Stringer): Promise<string[] | null> {
		const node = this.getNode(dirpath);
		if (node?.type !== 'directory') {
			return null;
		}
		return node.children;
	}

	async utime(path: Stringer, stats: StorageNodeTime): Promise<void> {
		const node = this.getNode(path);
		if (!node) {
			return;
		}

		const prevStats = node.stats;
		const nextStats = {
			mtime: stats.mtime ? stringify(stats.mtime) : prevStats.mtime,
			ctime: stats.ctime ? stringify(stats.ctime) : prevStats.ctime,
			atime: stats.atime ? stringify(stats.atime) : prevStats.atime,
		};
		node.stats = nextStats;

		const dirname = this.getDirname(path);
		if (dirname === stringify(path)) {
			return;
		}
		await this.utime(dirname, nextStats);
	}

	async mkdir(
		dirpath: Stringer,
		stats?: StorageNodeTime | undefined,
	): Promise<void> {
		const parent = this.getDirname(dirpath);
		throw new Error('Method not implemented.');
	}

	stats(filepath: Stringer): Promise<StorageNodeStats | null> {
		throw new Error('Method not implemented.');
	}

	child(subpath: Stringer): MemoryStorage {
		const storage = new MemoryStorage(
			[this.root, subpath].join('/'),
			// child needs to reference the data of the parent
			this.fs,
		);
		return storage;
	}
}
