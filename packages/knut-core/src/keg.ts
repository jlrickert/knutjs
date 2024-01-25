import { Dex } from './dex.js';
import { KegFile } from './kegFile.js';
import {
	KegIndex,
	KegPlugin,
	changesIndexPlugin,
	nodesIndexPlugin,
} from './kegPlugin.js';
import { KegStorage } from './kegStorage/kegStorage.js';
import { KegNode, NodeId } from './node.js';

export class Keg {
	indexList = new Map<string, KegIndex>();

	static async fromStorage(storage: KegStorage): Promise<Keg | null> {
		const kegFile = await KegFile.fromStorage(storage);
		const dex = await Dex.fromStorage(storage);
		if (!kegFile || !dex) {
			return null;
		}
		const keg = new Keg(kegFile, dex, storage);
		keg.addPlugin(nodesIndexPlugin);
		keg.addPlugin(changesIndexPlugin);
		return keg;
	}

	private constructor(
		public readonly kegFile: KegFile,
		public readonly dex: Dex,
		public readonly storage: KegStorage,
	) {}

	async getNode(nodeId: NodeId): Promise<KegNode | null> {
		const node = KegNode.load(nodeId, this.storage);
		return node;
	}

	async *getNodeList() {
		const entries = this.dex.entries;
		for (const entry of entries) {
			const node = await this.getNode(entry.nodeId);
			if (node) {
				yield [entry.nodeId, node] as const;
			}
		}
	}

	async update(): Promise<void> {
		for (const [, { update }] of this.indexList) {
			if (update) {
				await update();
			}
		}
	}

	async merge(storage: KegStorage) {
		await this.dex.merge(storage);
		await this.kegFile.merge(storage);
		for await (const [nodeId, node] of this.getNodeList()) {
			await node.merge(storage.child(nodeId));
		}
	}

	async addPlugin(plugin: KegPlugin) {
		plugin({
			registerIndex: async (name, indexer) => {
				const index = await indexer(this);
				this.dex.addIndex(name, index);
			},
			registerOnWrite: async () => {},
		});
	}
}
