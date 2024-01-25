import { NodeId } from '../node.js';
import { Stringer, currentEnvironment, now } from '../utils.js';
import { StorageNodeStats, KegStorage } from './kegStorage.js';

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
	private subpath?: string;

	constructor(prefix?: string, subpath?: string | Stringer) {
		this.prefix = prefix ?? 'kegfs';
		this.subpath =
			typeof subpath === 'string' ? subpath : subpath?.stringify();
		if (currentEnvironment !== 'dom') {
			throw new Error('WebStorage not supported');
		}
	}

	async listNodes(): Promise<NodeId[]> {
		const fs = this.getFS();
		const set = new Set<number>();
		for (const filepath in fs.index) {
			if (fs.index.hasOwnProperty(filepath)) {
				const [id] = filepath.split('/');
				const nodeId = NodeId.parse(id);
				if (nodeId) {
					set.add(nodeId.id);
				}
			}
		}
		const results = [...set].map((id) => new NodeId(id));
		results.sort((a, b) => (a.gt(b) ? 1 : -1));
		return results;
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

	async stats(filepath: string): Promise<StorageNodeStats | null> {
		const fs = this.getFS();
		const index = fs.index[filepath];
		if (!index) {
			return null;
		}
		return fs.nodes[index].stats;
	}

	child(subpath: string | Stringer): KegStorage {
		return new WebStorage(
			this.prefix,
			this.subpath ? `${this.subpath}/${subpath}` : subpath,
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

	private updateFs(f: (fs: KegFs) => void) {
		const fs = this.getFS();
		f(fs);
		window.localStorage.setItem(this.prefix, JSON.stringify(fs));
	}
}
