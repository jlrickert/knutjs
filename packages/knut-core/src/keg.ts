import { Dex } from './dex.js';
import { EnvStorage } from './envStorage.js';
import { KegFile } from './kegFile.js';
import { KegStorage, loadKegStorage } from './kegStorage.js';
import { KegNode, NodeId } from './node.js';
import { collectAsync } from './utils.js';

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
