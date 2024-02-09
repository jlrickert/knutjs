import * as FPMap from 'fp-ts/lib/Map.js';
import * as FPString from 'fp-ts/lib/string.js';
import { pipe } from 'fp-ts/lib/function.js';
import { Dex } from './dex.js';
import { EnvStorage } from './envStorage.js';
import { KegFile } from './kegFile.js';
import { KegStorage, loadKegStorage } from './kegStorage.js';
import { KegNode, NodeId } from './node.js';
import { collectAsync, stringify } from './utils.js';
import { MemoryStorage } from './storage/memoryStorage.js';
import { KegPlugin, KegPluginContext } from './internal/plugins/kegPlugin.js';
import { GenericStorage } from './storage/storage.js';
import { NodeContent } from './nodeContent.js';
import { MetaFile } from './metaFile.js';

export type CreateNodeOptions = {
	content: string;
	tags?: string;
};

export class Keg {
	static async voidKeg(): Promise<Keg> {
		const keg = new Keg(
			KegFile.create(),
			Dex.create(),
			KegStorage.fromStorage(MemoryStorage.create()),
			EnvStorage.createInMemory(),
		);
		return keg;
	}

	static async fromStorage(
		storage: string | GenericStorage | KegStorage,
		env: EnvStorage,
	): Promise<Keg | null> {
		let store: KegStorage;
		if (typeof storage === 'string') {
			store = loadKegStorage(storage);
		} else if (storage instanceof KegStorage) {
			store = storage;
		} else {
			store = KegStorage.fromStorage(storage);
		}

		const kegFile = await KegFile.fromStorage(store);
		const dex = Dex.create();
		if (!kegFile) {
			return null;
		}
		const keg = new Keg(kegFile, dex, store, env);
		return keg;
	}

	static async create(
		storage: string | GenericStorage | KegStorage,
		env: EnvStorage,
	) {
		let store: KegStorage;
		if (typeof storage === 'string') {
			store = loadKegStorage(storage);
		} else if (storage instanceof KegStorage) {
			store = storage;
		} else {
			store = KegStorage.fromStorage(storage);
		}

		const kegFile = KegFile.create();
		const dex = Dex.create();
		if (!kegFile) {
			return null;
		}
		const keg = new Keg(kegFile, dex, store, env);
		const zeroNode = await KegNode.zeroNode();
		await keg.setNode(new NodeId(0), zeroNode);
		return keg;
	}

	private constructor(
		public readonly kegFile: KegFile,
		public readonly dex: Dex,
		public readonly storage: KegStorage,
		private readonly env: EnvStorage,
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
		this.dex.addNode(nodeId, node);
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
