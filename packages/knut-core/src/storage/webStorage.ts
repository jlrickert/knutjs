import { isNode, now } from '../utils.js';
import { KegFsStats, KegStorage, Stringer } from './storage.js';

export type KegFsNode = {
	content: string;
	stats: {
		mtime: string;
	};
};
export type KegFs = {
	version: '0.1';
	nodes: KegFsNode[];
	index: { [filepath: string]: number };
};

export class WebStorage implements KegStorage {
	private prefix: string;
	constructor(prefix?: string) {
		this.prefix = prefix ?? 'kegfs';
		if (isNode) {
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
