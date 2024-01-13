import { KegNode, NodeId } from './node.js';
import { KegStorage } from './storage/storage.js';

export type DexEntry = {
	nodeId: NodeId;
	updated: string;
	title: string;
	tags?: string[];
};

export type KegIndex = {
	addNode(nodeId: NodeId, node: KegNode): void;
	getFilepath(): string;
	stringify(): string;
};

export class TagsIndex implements KegIndex {
	addNode(nodeId: NodeId, node: KegNode): void {
		throw new Error('Method not implemented.');
	}
	getFilepath(): string {
		return `dex/tags`;
	}
	stringify(): string {
		throw new Error('Method not implemented.');
	}
}

export class ChangeIndex implements KegIndex {
	private entryList: DexEntry[] = [];

	fromEntries(entries: DexEntry[]) {
		const index = new ChangeIndex();
		for (const entry of entries ?? []) {
			this.addEntry(entry);
		}
		return index;
	}

	constructor() {}

	addNode(nodeId: NodeId, node: KegNode): void {
		this.addEntry({
			nodeId: nodeId,
			title: node.title ?? '',
			updated: node.updated,
		});
	}

	addEntry(entry: DexEntry) {
		this.entryList.push(entry);
		this.entryList.sort((a, b) => {
			return (
				new Date(a.updated).getUTCSeconds() -
				new Date(b.updated).getUTCSeconds()
			);
		});
	}

	getFilepath(): string {
		return `dex/changes.md`;
	}

	stringify(): string {
		const items: string[] = [];
		for (const entry of this.entryList) {
			const id = entry.nodeId.stringify();
			const line = `* ${entry.updated} [${entry.title}](../${id})`;
			items.push(line);
		}
		return items.join('\n');
	}
}

export class NodeIndex implements KegIndex {
	private entryList: DexEntry[] = [];

	static fromEntries(entries: DexEntry[]): NodeIndex {
		const index = new NodeIndex();
		for (const entry of entries) {
			index.addEntry(entry);
		}
		return index;
	}

	constructor() {}

	addNode(nodeId: NodeId, node: KegNode): void {
		this.addEntry({
			title: node.title ?? '',
			updated: node.updated,
			nodeId,
		});
	}

	getFilepath(): string {
		return `dex/nodes.tsv`;
	}

	getEntries(): readonly DexEntry[] {
		return this.entryList;
	}

	addEntry(entry: DexEntry) {
		this.entryList.push(entry);
		this.entryList.sort((a, b) => (a.nodeId.lt(b.nodeId) ? -1 : 1));
	}

	stringify(): string {
		const items: string[] = [];
		for (const entry of this.entryList) {
			const id = entry.nodeId.stringify();
			const line = `${id}\t${entry.updated}\t ${entry.title}`;
			items.push(line);
		}
		return items.join('\n');
	}
}

/**
 * Maintains list of index for the keg
 */
export class Dex {
	private changesIndex = new ChangeIndex();
	private nodesIndex = new NodeIndex();
	private indexes = new Map<string, KegIndex>();

	static async fromStorage(storage: KegStorage) {
		const content = await storage.read('dex/nodes.tsv');
		if (content === null) {
			return null;
		}
		const lines = content.split('\n');
		const dex = new Dex();
		for (const line of lines) {
			// ingore empty last line if it exists
			if (line === '') {
				continue;
			}
			const [id, updated, title] = line.split('\t');
			const nodeId = new NodeId(id);
			const entry: DexEntry = { title, updated, nodeId };
			dex.nodesIndex.addEntry(entry);
			dex.changesIndex.addEntry(entry);
		}
		return dex;
	}

	constructor() {}

	getEntries(): readonly DexEntry[] {
		return this.nodesIndex.getEntries();
	}

	getNodeIndex(): NodeIndex {
		return this.nodesIndex;
	}

	getChangesIndex(): ChangeIndex {
		return this.changesIndex;
	}

	addNode(nodeId: NodeId, node: KegNode) {
		this.nodesIndex.addNode(nodeId, node);
		this.changesIndex.addNode(nodeId, node);
		for (const [, index] of this.indexes) {
			index.addNode(nodeId, node);
		}
	}
}
