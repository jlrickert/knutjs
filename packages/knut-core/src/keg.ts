import { pipe } from 'fp-ts/lib/function.js';
import { Dex } from './dex.js';
import { EnvStorage } from './envStorage.js';
import { KegFile } from './kegFile.js';
import { KegStorage, loadKegStorage } from './kegStorage.js';
import { KegNode, NodeId } from './node.js';
import { collectAsync } from './utils.js';
import { collectAsync, stringify } from './utils.js';
import { NodeContent } from './nodeContent.js';
import { MetaFile } from './metaFile.js';

export type CreateNodeOptions = {
	content: string;
	tags?: string;
};

export class Keg {
	static async fromStorage(
		storage: string | KegStorage,
		env: EnvStorage,
	): Promise<Keg | null> {
		const store =
			typeof storage === 'string' ? loadKegStorage(storage) : storage;
		const kegFile = await KegFile.fromStorage(store);
		const dex = await Dex.fromStorage(store);
		if (!kegFile || !dex) {
			return null;
		}
		const keg = new Keg(kegFile, dex, store);
		return keg;
	}

	private constructor(
		public readonly kegFile: KegFile,
		public readonly dex: Dex,
		public readonly storage: KegStorage,
	) {}

	async last(): Promise<NodeId | null> {
		const nodeList = await collectAsync(this.storage.listNodes());
		nodeList.sort((a, b) => (a.lt(b) ? 1 : -1));
		const nodeId = nodeList.length > 0 ? nodeList[0] : null;
		return nodeId;
	}

	async getNode(nodeId: NodeId): Promise<KegNode | null> {
		const node = await KegNode.fromStorage(nodeId, this.storage);
		return node;
	}

	async createNode(): Promise<NodeId> {
		const nodeId = pipe(
			await this.last(),
			(a) => a?.next() ?? new NodeId(0),
		);
		const node = await KegNode.create();
		await this.setNode(nodeId, node);
		return nodeId;
	}

	async setNode(nodeId: NodeId, node: KegNode): Promise<void> {
		const filepath = NodeContent.filePath(nodeId);
		const metapath = MetaFile.filePath(nodeId);
		await this.storage.write(filepath, node.content);
		await this.storage.write(metapath, stringify(node.meta));
	}

	async *getNodeList(): AsyncGenerator<
		readonly [NodeId, KegNode],
		void,
		unknown
	> {
		for (const entry of this.dex.entries) {
			const node = await this.getNode(entry.nodeId);
			if (node) {
				yield [entry.nodeId, node] as const;
			}
		}
	}

	async update(): Promise<void> {}
}
