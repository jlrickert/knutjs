import { Data } from 'effect';
import { pipe } from 'fp-ts/lib/function.js';
import { KegNode, NodeId } from './KegNode.js';
import { Optional, Future } from './internal/index.js';
import { stringify } from './utils.js';
import { StorageTrait } from './storage/index.js';

type DexEntryShape = {
	readonly nodeId: NodeId;
	readonly updated: Date;
	readonly title: string;
};

export class DexEntry extends Data.Class<DexEntryShape> {
	static fromNode(nodeId: NodeId, node: KegNode): DexEntry {
		return new DexEntry({
			nodeId,
			updated: node.updated,
			title: node.title,
		});
	}

	stringify() {
		return [
			stringify(this.nodeId),
			stringify(this.updated),
			this.title,
		].join('\t');
	}
}

/**
 * Maintains an index of nodes within a keg
 */
export class Dex {
	private entryList: DexEntry[] = [];

	/**
	 * Creates a dex from 'dex/nodes.tsv' if avaialable
	 * @param storage
	 */
	static async fromStorage(
		storage: StorageTrait,
	): Future.Future<Optional.Optional<Dex>> {
		const content = await storage.read('dex/nodes.tsv');
		if (Optional.isNone(content)) {
			return content;
		}
		const lines = content.split('\n');
		const dex = new Dex();
		for (const line of lines) {
			// ignore empty last line if it exists
			if (line === '') {
				continue;
			}
			const [id, updated, title] = line.split('\t');
			const entry = pipe(
				KegNode.parseNodeId(id),
				Optional.map(
					(nodeId): DexEntry =>
						new DexEntry({
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

	/**
	 * Writes out data to 'dex/nodes.tsv'
	 */
	async toStorage(storage: StorageTrait): Future.Future<boolean> {
		const data = this.entries
			.map(({ nodeId, updated, title }) =>
				[nodeId, updated, title].map(stringify).join('\t'),
			)
			.join('\n');
		return await storage.write('dex/nodes.tsv', data);
	}

	get entries(): DexEntry[] {
		return [...this.entryList];
	}

	getEntry(nodeId: NodeId) {
		const entry = this.entryList.find((entry) => entry.nodeId === nodeId);
		return Optional.fromNullable(entry);
	}

	addEntry(entry: DexEntry): void {
		const index = this.entryList.findIndex(
			(a) => a.nodeId === entry.nodeId,
		);
		if (index < 0) {
			this.entryList.push(entry);
			return;
		}
		this.entryList[index] = entry;
		this.entryList.sort((a, b) => {
			if (a.nodeId === b.nodeId) {
				return 0;
			}
			return a.nodeId < b.nodeId ? -1 : 1;
		});
	}

	clear(): void {
		this.entryList = [];
	}

	addNode(nodeId: NodeId, node: KegNode): void {
		const entry = new DexEntry({
			nodeId,
			updated: node.updated,
			title: node.title,
		});
		this.addEntry(entry);
	}

	removeNode(nodeId: NodeId): void {
		const index = this.entryList.findIndex((a) => a.nodeId === nodeId);
		if (index < 0) {
			return;
		}

		delete this.entryList[index];
	}
}
