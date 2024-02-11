import { KegNode, NodeId } from './node.js';
import { KegStorage } from './kegStorage.js';

export type DexEntry = {
	nodeId: NodeId;
	updated: Date;
	title: string;
	tags?: string[];
};

/**
 * Maintains list of index for the keg
 */
export class Dex {
	private entryList: DexEntry[] = [];

	static create() {
		return new Dex();
	}

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
			const nodeId = NodeId.parsePath(id);
			if (nodeId) {
				const entry: DexEntry = {
					title,
					updated: new Date(updated),
					nodeId,
				};
				dex.addEntry(entry);
			}
		}
		return dex;
	}

	public constructor() {}

	get entries(): DexEntry[] {
		return [...this.entryList];
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
		this.entryList.sort((a, b) => {
			if (a.nodeId.eq(b.nodeId)) {
				return 0;
			}
			return a.nodeId.lt(b.nodeId) ? -1 : 1;
		});
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
