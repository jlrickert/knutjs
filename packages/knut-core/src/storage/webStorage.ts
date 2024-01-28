import { Stringer, currentEnvironment, now, stringify } from '../utils.js';
import {
	GenericStorage,
	StorageNodeStats,
	StorageNodeTime,
} from './storage.js';

export type KegFsFileNode = {
	type: 'file';
	content: string;
	stats: {
		mtime: string;
		atime: string;
		ctime: string;
	};
};

export type KegFsDirNode = {
	type: 'directory';
	children: number[];
	stats: {
		mtime: string;
		atime: string;
		ctime: string;
	};
};

export type KegFsNode = KegFsFileNode | KegFsDirNode;

export type KegFs = {
	version: '0.1';
	nodes: KegFsNode[];
	index: { [filepath: string]: number };
};

export class WebStorage implements GenericStorage {
	private prefix: string;
	private root: string;

	constructor(prefix?: string, root: Stringer = '/') {
		this.prefix = prefix ?? 'kegfs';
		this.root = stringify(root);
		if (currentEnvironment !== 'dom') {
			throw new Error('WebStorage not supported');
		}
	}

	// async listNodes(): Promise<NodeId[]> {
	// 	const fs = this.getFS();
	// 	const set = new Set<number>();
	// 	for (const filepath in fs.index) {
	// 		if (fs.index.hasOwnProperty(filepath)) {
	// 			const [id] = filepath.split('/');
	// 			const nodeId = NodeId.parse(id);
	// 			if (nodeId) {
	// 				set.add(nodeId.id);
	// 			}
	// 		}
	// 	}
	// 	const results = [...set].map((id) => new NodeId(id));
	// 	results.sort((a, b) => (a.gt(b) ? 1 : -1));
	// 	return results;
	// }

	async read(filepath: string): Promise<string | null> {
		const fp = `${this.root}/${filepath}`;
		const fs = this.getFS();
		const index = fs.index[fp];
		const node = fs.nodes[index];
		if (node.type === 'file') {
			return node.content ?? null;
		}
		return null;
	}

	async write(
		filepath: Stringer,
		contents: Stringer,
		stats?: StorageNodeStats | undefined,
	): Promise<void> {
		const fp = `${this.root}/${stringify(filepath)}`;
		const data = stringify(contents);
		const parts = fp.split('/');
		if (parts.length > 1) {
			for (let i = 0; i < parts.length - 1; i++) {
				const dirpath = parts[i];
				await this.mkdir(dirpath);
			}
		}
		const dirname = parts.slice(0, -1).join('/');
		await this.mkdir(dirname);
		await this.utime(dirname, { mtime: stats?.mtime });

		await this.updateFs(async (fs) => {
			const index = fs.index[stringify(filepath)];
			const currentTime = now('Y-m-D H:M');
			if (!index) {
				fs.index[stringify(filepath)] = fs.nodes.length;
				fs.nodes.push({
					type: 'file',
					content: data,
					stats: {
						mtime: stringify(stats?.mtime ?? currentTime),
						atime: stringify(stats?.atime ?? currentTime),
						ctime: stringify(stats?.ctime ?? currentTime),
					},
				});
			}
		});
	}

	async utime(path: string, stats: StorageNodeTime): Promise<void> {
		await this.updateFs(async (fs) => {
			const index = fs.index[path];
			if (!index) {
				return;
			}
			const prevStats = await this.stats(path);
			const n = now('Y-m-D H:M');
			fs.nodes[index].stats = {
				ctime: stringify(stats.ctime ?? prevStats?.ctime ?? n),
				atime: stringify(stats.atime ?? prevStats?.atime ?? n),
				mtime: stringify(stats.mtime ?? prevStats?.mtime ?? n),
			};
		});
	}

	async listNodePaths(): Promise<string[]> {
		const fs = this.getFS();
		return Object.keys(fs.index);
	}

	async stats(filepath: string): Promise<StorageNodeStats | null> {
		const fs = this.getFS();
		const index = fs.index[filepath];
		if (!index) {
			return null;
		}
		return fs.nodes[index].stats;
	}

	async readdir(dirpath: string): Promise<string[]> {
		this.listNodePaths();
	}

	async mkdir(
		dirpath: Stringer,
		stats?: StorageNodeStats | undefined,
	): Promise<void> {
		await this.updateFs(async (fs) => {
			const index = fs.index[stringify(dirpath)];
			const currentTime = now('Y-m-D H:M');
			if (!index) {
				fs.index[stringify(dirpath)] = fs.nodes.length;
				fs.nodes.push({
					type: 'directory',
					children: [],
					stats: {
						mtime: stats?.mtime?.toString() ?? currentTime,
						atime: stats?.atime?.toString() ?? currentTime,
						ctime: stats?.ctime?.toString() ?? currentTime,
					},
				});
			}
		});
	}

	child(subpath: string | Stringer): GenericStorage {
		return new WebStorage(
			this.prefix,
			this.root ? `${this.root}/${subpath}` : subpath,
		);
	}

	private getFS(): KegFs {
		const rawData = window.localStorage.getItem(this.prefix);
		if (!rawData) {
			return this.buildFS();
		}
		return JSON.parse(rawData);
	}

	private buildFS(): KegFs {
		const fs: KegFs = { version: '0.1', nodes: [], index: {} };
		window.localStorage.setItem(this.prefix, JSON.stringify(fs));
		return fs;
	}

	private async updateFs(f: (fs: KegFs) => Promise<void>): Promise<void> {
		const fs = this.getFS();
		await f(fs);
		window.localStorage.setItem(this.prefix, JSON.stringify(fs));
	}
}
