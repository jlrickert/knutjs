import { pipe } from 'fp-ts/lib/function.js';
import { Storage } from './Storage/index.js';
import { KegFile } from './kegFile.js';
import { Dex } from './dex.js';
import { KegStorage } from './kegStorage.js';
import { KegNode, NodeId, NodeOptions } from './node.js';
import { detectBackend } from './Backend/Backend.js';
import {
	Future,
	Optional,
	optionalT,
	collectAsync,
	stringify,
} from './Utils/index.js';

const T = optionalT(Future.Monad);

export type CreateNodeOptions = {
	content: string;
	tags?: string;
};

export class Keg {
	static async fromUri(uri: string): Future.OptionalFuture<Keg> {
		const platform = await detectBackend();
		if (Optional.isNone(platform)) {
			return Optional.none;
		}
		const storage = await platform.loader(uri);
		if (Optional.isNone(storage)) {
			return Optional.none;
		}
		return Keg.fromStorage(storage);
	}

	static async fromStorage(
		storage: Storage.GenericStorage,
	): Future.OptionalFuture<Keg> {
		const kegFile = await KegFile.fromStorage(storage);
		const dex = await Dex.fromStorage(storage);
		if (Optional.isNone(kegFile) || Optional.isNone(dex)) {
			return Optional.none;
		}
		const keg = new Keg(kegFile, dex, KegStorage.fromStorage(storage));
		return keg;
	}

	static async create(
		storage: Storage.GenericStorage,
	): Future.OptionalFuture<Keg> {
		const keg = await pipe(
			T.Do,
			T.bind('kegFile', () => KegFile.fromStorage(storage)),
			T.bind('dex', () => Dex.fromStorage(storage)),
			T.map(
				({ kegFile, dex }) =>
					new Keg(kegFile, dex, KegStorage.fromStorage(storage)),
			),
		);
		return keg;
	}

	/**
	 * Create a new keg if it doesn't exist
	 **/
	static async init(
		storage: Storage.GenericStorage,
	): Future.OptionalFuture<Keg> {
		if (await KegStorage.kegExists(storage)) {
			return Optional.none;
		}
		const kegFile = KegFile.default();
		await kegFile.toStorage(storage);

		const dex = new Dex();
		await dex.toStorage(storage);

		const keg = new Keg(kegFile, dex, KegStorage.fromStorage(storage));
		await pipe(
			keg.createNode(),
			T.chain(async (nodeId) => {
				const node = await KegNode.zeroNode();
				await node.toStorage(nodeId, keg.storage);
				return nodeId;
			}),
		);
		return keg;
	}

	private constructor(
		public readonly kegFile: KegFile,
		public readonly dex: Dex,
		public readonly storage: KegStorage,
	) {}

	async last(): Future.OptionalFuture<NodeId> {
		const nodeList = await collectAsync(this.storage.listNodes());
		nodeList.sort((a, b) => (a.lt(b) ? 1 : -1));
		const nodeId =
			nodeList.length > 0 ? Optional.some(nodeList[0]) : Optional.none;
		return nodeId;
	}

	async createNode(): Future.OptionalFuture<NodeId> {
		const nodeId = await pipe(
			this.last(),
			T.map((a) => a.next()),
			T.alt(() => Future.of(new NodeId(0))),
			T.chain(async (nodeId) => {
				const node = await KegNode.fromContent({ content: '' });
				await this.writeNode(nodeId, node);
				return nodeId;
			}),
		);

		return nodeId;
	}

	async getNode(nodeId: NodeId): Future.OptionalFuture<KegNode> {
		const node = await KegNode.fromStorage(nodeId, this.storage);
		return node;
	}

	async writeNode(nodeId: NodeId, node: KegNode): Future.Future<boolean> {
		const ok = await node.toStorage(nodeId, this.storage);
		return ok;
	}

	async writeNodeContent(
		nodeId: NodeId,
		{ content, updated, meta }: Partial<NodeOptions>,
	): Future.Future<boolean> {
		const node = await this.getNode(nodeId);
		if (Optional.isNone(node)) {
			return false;
		}

		if (Optional.isSome(content)) {
			await node.updateContent(content);
		}
		if (Optional.isSome(meta)) {
			node.updateMeta(meta);
		}
		if (Optional.isSome(updated)) {
			node.updated = updated;
		}
		return await node.toStorage(nodeId, this.storage);
	}

	async deleteNode(nodeId: NodeId): Future.Future<boolean> {
		return this.storage.rm(stringify(nodeId));
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

	async update(): Future.Future<void> {}
}
