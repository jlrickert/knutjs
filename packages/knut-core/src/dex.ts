import { KegNode, NodeId } from './node.js';
import { KegStorage } from './kegStorage/kegStorage.js';
import { KegIndex } from './kegPlugin.js';

export type DexEntry = {
	nodeId: NodeId;
	updated: string;
	title: string;
	tags?: string[];
};

/**
 * Maintains list of index for the keg
 */
export class Dex {
	private entryList: DexEntry[] = [];
	private indexMap = new Map<string, KegIndex>();

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
			const nodeId = NodeId.parse(id);
			if (nodeId) {
				const entry: DexEntry = { title, updated, nodeId };
				dex.addEntry(entry);
			}
		}
		return dex;
	}

	constructor() {}

	get entries(): readonly DexEntry[] {
		return this.entryList;
	}

	getIndex(name: string): KegIndex | null {
		return this.indexMap.get(name) ?? null;
	}

	async *getIndexList() {
		for (const [name, kegIndex] of this.indexMap) {
			yield [name, kegIndex] as const;
		}
	}

	addIndex(name: string, index: KegIndex): void {
		this.indexMap.set(name, index);
	}

	addEntry(entry: DexEntry): void {
		const index = this.entryList.findIndex((a) =>
			a.nodeId.eq(entry.nodeId),
		);
		if (index < 0) {
			this.entryList.push(entry);
			return;
		}
		this.entryList[index] = entry;
	}

	clear(): void {
		this.entryList = [];
	}

	addNode(nodeId: NodeId, node: KegNode): void {
		const entry: DexEntry = {
			nodeId,
			updated: node.updated,
			title: node.title,
			tags: [...node.getTags()],
		};
		this.addEntry(entry);
	}

	removeNode(nodeId: NodeId): void {
		const index = this.entryList.findIndex((a) => a.nodeId.eq(nodeId));
		if (index < 0) {
			return;
		}

		delete this.entryList[index];
	}
}
