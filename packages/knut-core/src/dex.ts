import { pipe } from 'fp-ts/lib/function.js';
import { KegNode, NodeId } from './node.js';
import { Storage } from './Storage/index.js';
import { Future, Optional, stringify } from './Utils/index.js';

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

	static async fromStorage(storage: Storage.GenericStorage): Future.OptionalFuture<Dex> {
		const content = await storage.read('dex/nodes.tsv');
		if (Optional.isNone(content)) {
			return content;
		}
		const lines = content.split('\n');
		const dex = new Dex();
		for (const line of lines) {
			// ingore empty last line if it exists
			if (line === '') {
				continue;
			}
			const [id, updated, title] = line.split('\t');
			const entry = pipe(
				NodeId.parsePath(id),
				Optional.map(
					(nodeId): DexEntry => ({
						title,
						nodeId,
						updated: new Date(updated),
					}),
				),
			);
			if (Optional.isSome(entry)) {
				dex.addEntry(entry);
			}
		}
		return dex;
	}

	async toStorage(storage: Storage.GenericStorage): Future.Future<boolean> {
		const data = this.entries
			.map(({ nodeId, updated, title }) =>
				[nodeId, updated, title].map(stringify).join('\t'),
			)
			.join('\n');
		const ok = await storage.write('dex/nodes.tsv', data);
		return ok;
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
