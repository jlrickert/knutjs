import * as Path from 'path';
import invariant from 'tiny-invariant';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { Node } from './node.js';
import { now } from './utils.js';
import { Dex } from './dex.js';
import { KegFile } from './kegFile.js';

export type Stringer = {
	stringify: () => string;
};

export type Storage = {
	read(filepath: string): Promise<string | null>;
	write(filepath: string | Stringer, contents: string): Promise<void>;
	stats(filepath: string): Promise<KegFsStats | null>;
	listIndexPaths(): Promise<string[] | null>;
	listNodePaths(): Promise<string[] | null>;
};

type KegFsStats = {
	mtime: string;
};
type KegFsNode = {
	content: string;
	stats: {
		mtime: string;
	};
};
type KegFs = {
	version: '0.1';
	nodes: KegFsNode[];
	index: { [filepath: string]: number };
};

export type memoryStorageOptions = {};
export class MemoryStorage implements Storage {
	private data: KegFs = {
		version: '0.1',
		nodes: [],
		index: {},
	};

	static async copyFrom(
		storage: FileSystemStorage,
	): Promise<MemoryStorage | null> {
		const memStorage = new MemoryStorage();
		const dex = await Dex.fromStorage(storage);
		const kegFile = await KegFile.load(storage);
		if (kegFile === null || dex === null) {
			return null;
		}
		await memStorage.write(kegFile.getFilepath(), kegFile);

		const nodeIndex = dex.getNodeIndex();
		await memStorage.write(nodeIndex.getFilepath(), nodeIndex);

		const changesIndex = dex.getChangesIndex();
		await memStorage.write(changesIndex.getFilepath(), changesIndex);

		const nodeList = await storage.listNodePaths();
		if (nodeList === null) {
			return null;
		}
		for (const filepath of nodeList) {
			const content = await storage.read(filepath);
			if (content === null) {
				continue;
			}
			await memStorage.write(filepath, content);
		}
		return memStorage;
	}

	async listIndexPaths(): Promise<string[] | null> {
		const paths: string[] = [];
		for (const indexName in this.data.index) {
			if (this.data.index.hasOwnProperty(indexName)) {
				paths.push(`dex/${indexName}`);
			}
		}
		return paths;
	}

	async listNodePaths(): Promise<string[] | null> {
		const keypaths = [];
		for (const filepath in this.data.index) {
			if (this.data.index.hasOwnProperty(filepath)) {
				const nodeId = Node.parseNodeId(filepath);
				if (nodeId) {
					keypaths.push(nodeId);
				}
			}
		}
		return keypaths;
	}

	async read(filepath: string): Promise<string | null> {
		const index = this.data.index[filepath];
		if (index === undefined) {
			return null;
		}
		const data = this.data.nodes[index];
		invariant(data, 'Expect to get data when index is defined');
		return data.content;
	}

	async write(filepath: string, content: string | Stringer): Promise<void> {
		this.data.index[filepath] = this.data.nodes.length;
		const data =
			typeof content === 'string' ? content : content.stringify();
		this.data.nodes.push({
			content: data,
			stats: { mtime: now('Y-m-D H:M') },
		});
	}

	async stats(filepath: string): Promise<KegFsStats | null> {
		const index = this.data.index[filepath];
		if (index === undefined) {
			return null;
		}
		return this.data.nodes[index].stats ?? null;
	}
}

export type ApiStorageOptions = {
	url: string;
};

export class ApiStorage implements Storage {
	constructor(options: ApiStorageOptions) {}

	listIndexPaths(): Promise<string[] | null> {
		throw new Error('Method not implemented.');
	}

	async listNodePaths(): Promise<string[] | null> {
		throw new Error('Method not implemented.');
	}
	async read(filepath: string): Promise<string | null> {
		return null;
	}
	async write(filepath: string, content: string | Stringer): Promise<void> {}

	async stats(filepath: string): Promise<KegFsStats | null> {
		return null;
	}
}

export class WebStorage implements Storage {
	private prefix: string;
	constructor(prefix?: string) {
		this.prefix = prefix ?? 'kegfs';
		if (
			typeof window === 'undefined' ||
			typeof window.localStorage === 'undefined'
		) {
			throw new Error('WebStorage not supported');
		}
	}
	listIndexPaths(): Promise<string[] | null> {
		throw new Error('Method not implemented.');
	}
	async read(filepath: string): Promise<string | null> {
		const fs = this.getFS();
		const index = fs.index[filepath];
		return fs.nodes[index]?.content ?? null;
	}

	async write(filepath: string, content: string | Stringer): Promise<void> {
		const data =
			typeof content === 'string' ? content : content.stringify();
		this.updateFs((fs) => {
			const index = fs.index[filepath];
			if (!index) {
				fs.index[filepath] = fs.nodes.length;
				fs.nodes.push({
					content: data,
					stats: { mtime: now('Y-m-D H:M') },
				});
			}
		});
	}

	async listNodePaths(): Promise<string[]> {
		const fs = this.getFS();
		return Object.keys(fs.index);
	}

	async stats(filepath: string): Promise<KegFsStats | null> {
		const fs = this.getFS();
		const index = fs.index[filepath];
		if (!index) {
			return null;
		}
		return fs.nodes[index].stats;
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

	private updateFs(f: (fs: KegFs) => void) {
		const fs = this.getFS();
		f(fs);
		window.localStorage.setItem(this.prefix, JSON.stringify(fs));
	}
}

export type FileSystemStorageOptions = { kegpath: string };
export class FileSystemStorage implements Storage {
	/**
	 * Finds the nearest keg file. Here is where it will look for in order
	 * of higher precendence to lowest:
	 *
	 * - $KEG_CURRENT/keg
	 * - $KEG_CURRENT/docs/keg
	 * - ./keg
	 * - ./docs/keg
	 * - <git repo>/keg
	 * - <git repo>/docs/keg
	 */
	static async findNearestKegpath(): Promise<string | null> {
		const env = process.env.KEG_CURRENT;
		const exists = async (filepath: string): Promise<boolean> => {
			const stats = await stat(filepath);
			return stats.isFile();
		};
		if (env) {
			try {
				const path = Path.join(env, 'keg');
				if (await exists(path)) {
					return Path.dirname(path);
				}
			} catch (e) {}
			try {
				const path = Path.join(env, 'docs', 'keg');
				if (await exists(path)) {
					return Path.dirname(path);
				}
			} catch (e) {}
		}

		// Look for a child keg from root
		let root: string | null = process.cwd();
		const thingsToCheck: string[] = [];
		while (root) {
			let dirs = await readdir(root);
			for (const file of dirs) {
				if (file === 'keg') {
					return root;
				}

				// add child directory to list of things to check
				const path = Path.join(root, file);
				const s = await stat(path);
				if (s.isDirectory()) {
					thingsToCheck.push(path);
				}
			}
			root = thingsToCheck.shift() ?? null;
		}
		return null;
	}

	static async findNearest(): Promise<Storage | null> {
		const kegpath = await FileSystemStorage.findNearestKegpath();
		if (kegpath === null) {
			return null;
		}
		const storage = new FileSystemStorage({ kegpath });
		return storage;
	}

	public readonly kegpath: string;
	public constructor(options: FileSystemStorageOptions) {
		this.kegpath = options.kegpath;
	}

	async listIndexPaths(): Promise<string[] | null> {
		const dexDir = Path.join(this.kegpath, 'dex');
		const fileList = await readdir(dexDir);
		return fileList;
	}

	async listNodePaths(): Promise<string[] | null> {
		const dirs = await readdir(this.kegpath);
		return dirs.filter((dir) => {
			return !(dir.includes('keg') || dir.includes('dex'));
		});
	}
	async read(filepath: string): Promise<string | null> {
		const path = Path.join(this.kegpath, filepath);
		try {
			const content = await readFile(path, { encoding: 'utf-8' });
			return content;
		} catch (error) {
			return null;
		}
	}
	async write(filepath: string, contents: string | Stringer): Promise<void> {
		const data =
			typeof contents === 'string' ? contents : contents.stringify();
		try {
			const path = Path.join(this.kegpath, filepath);
			writeFile(path, data, 'utf-8');
		} catch (error) {
			return;
		}
	}

	async stats(filepath: string): Promise<KegFsStats | null> {
		const path = Path.join(this.kegpath, filepath);
		try {
			const stats = await stat(path);
			return {
				mtime: stats.mtime.toString(),
			};
		} catch (error) {
			return null;
		}
	}
}
