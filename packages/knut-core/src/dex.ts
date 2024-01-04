import { Markdown } from './markdown.js';
import { Node } from './node.js';
import { Storage } from './storage.js';

export type DexEntry = {
	nodeId: string;
	updated: string;
	title: string;
};

export class Dex {
	private entries: DexEntry[];

	static async load(storage: Storage) {
		const content = await storage.read('dex/nodes.tsv');
		if (content === null) {
			return null;
		}
		const lines = content.split('\n');
		const dex = new Dex();
		for (const line of lines) {
			const [nodeId, updated, title] = line.split('\t');
			dex.addNode({ title, updated, nodeId });
		}
		return dex;
	}

	constructor() {
		this.entries = [];
	}

	getNodeIndex(): string {
		const lines = [];
		for (const entry of this.entries) {
			const { nodeId, updated, title } = entry;
			const line = `${nodeId}\t${updated}\t${title}`;
			lines.push(line);
		}
		return lines.join('\n');
	}

	getChangesIndex(): string {
		const entries = { ...this.entries };
		entries.sort((a, b) => {
			if (a.updated === b.updated) {
				return 0;
			}
			return a.updated < b.updated ? -1 : 1;
		});
		const markdown = Markdown.createIndex({ entries: [] });
		return markdown.stringify();
	}

	getNodes(): DexEntry[] {
		return this.entries;
	}

	addNode(entry: DexEntry): this {
		this.entries.push(entry);
		this.entries.sort((a, b) => {
			if (a.nodeId === b.nodeId) {
				return 0;
			}
			return a.nodeId < b.nodeId ? -1 : 1;
		});
		return this;
	}
}
