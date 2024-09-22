import { NodeId } from './Data/index.js';
import { KegNode } from './KegNode.js';
import { Storage, StorageError } from './Storage/index.js';
import {
	Future,
	KegNodeAST,
	Optional,
	pipe,
	Result,
	stringify,
} from './Utils/index.js';

export type DexEntry = {
	nodeId: NodeId.NodeId;
	updated: Date;
	title: string;
	tags?: string[];
};

/**
 * Maintains list of index for the keg
 */
export class Dex {
	private entryList: DexEntry[] = [];

	static async fromStorage(
		storage: Storage.GenericStorage,
	): Future.FutureResult<Dex, StorageError.StorageError> {
		const content = await storage.read('dex/nodes.tsv');
		if (Result.isErr(content)) {
			return Result.err(content.error);
		}
		const lines = content.value.split('\n');
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
				dex.upsertEntry(entry);
			}
		}
		return Result.ok(dex);
	}

	async toStorage(
		storage: Storage.GenericStorage,
	): Future.FutureResult<true, StorageError.StorageError> {
		await storage.write('dex/nodex.tsv', this.getNodesTSVContent());
		await storage.write('dex/changes.md', this.getChangesMDContent());
		return Result.ok(true);
	}

	public constructor() {}

	get entries(): DexEntry[] {
		return [...this.entryList];
	}

	upsertEntry(entry: DexEntry): void {
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

	addNode(nodeId: number, node: KegNode): void {
		const entry: DexEntry = {
			nodeId,
			updated: node.getUpdate(),
			title: node.getTitle() ?? '',
			tags: node.getTags(),
		};
		this.upsertEntry(entry);
	}

	removeNode(nodeId: number): void {
		const index = this.entryList.findIndex((a) => a.nodeId === nodeId);
		if (index < 0) {
			return;
		}

		delete this.entryList[index];
	}

	getNodesTSVContent() {
		return this.entries
			.map(({ nodeId, updated, title }) =>
				[nodeId, updated, title].map(stringify).join('\t'),
			)
			.join('\n');
	}

	getChangesMDContent() {
		const changesData = this.entries.map((a) => a);
		changesData.sort((a, b) => {
			const d = b.updated.getTime() - a.updated.getTime();
			if (d !== 0) {
				return d;
			}
			return b.nodeId < a.nodeId ? -1 : 1;
		});
		const changesMarkdown = KegNodeAST.make();
		changesMarkdown.pushList(
			changesData.map(({ updated, title, nodeId }) => ({
				type: 'listItem',
				children: [
					{
						type: 'paragraph',
						children: [
							{ type: 'text', value: `${stringify(updated)} ` },
							{
								type: 'link',
								url: `../${nodeId}`,
								children: [{ type: 'text', value: title }],
							},
						],
					},
				],
			})),
		);
		return changesMarkdown.stringify();
	}
}
