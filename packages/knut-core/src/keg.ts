import { pipe } from 'fp-ts/lib/function.js';
import { Optional, optional } from './internal/optional.js';
import { Future, future } from './internal/future.js';
import { optionalT } from './internal/optionalT.js';
import { GenericStorage } from './storage/storage.js';
import { KegFile } from './kegFile.js';
import { Dex } from './dex.js';
import { KegStorage } from './kegStorage.js';
import { KegNode, NodeId } from './node.js';
import { collectAsync, stringify } from './utils.js';
import { detectBackend } from './backend.js';

export type CreateNodeOptions = {
	content: string;
	tags?: string;
};

export class Keg {
	static async fromUri(uri: string): Future<Optional<Keg>> {
		const platform = await detectBackend();
		if (optional.isNone(platform)) {
			return optional.none;
		}
		const storage = await platform.loader(uri);
		if (optional.isNone(storage)) {
			return optional.none;
		}
		return Keg.fromStorage(storage);
	}

	static async fromStorage(storage: GenericStorage): Future<Optional<Keg>> {
		const kegFile = await KegFile.fromStorage(storage);
		const dex = await Dex.fromStorage(storage);
		if (!kegFile || !dex) {
			return optional.none;
		}
		const keg = new Keg(kegFile, dex, KegStorage.fromStorage(storage));
		return keg;
	}

	static async create(storage: GenericStorage): Future<Optional<Keg>> {
		const T = optionalT(future.Monad);
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
	static async init(storage: GenericStorage): Future<Optional<Keg>> {
		if (await KegStorage.kegExists(storage)) {
			return optional.none;
		}
		const T = optionalT(future.Monad);
		const kegFile = KegFile.default();
		await kegFile.writeTo(storage);

		const dex = new Dex();
		await dex.writeTo(storage);

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

	async last(): Future<Optional<NodeId>> {
		const nodeList = await collectAsync(this.storage.listNodes());
		nodeList.sort((a, b) => (a.lt(b) ? 1 : -1));
		const nodeId =
			nodeList.length > 0 ? optional.some(nodeList[0]) : optional.none;
		return nodeId;
	}

	async createNode(): Future<Optional<NodeId>> {
		const T = optionalT(future.Monad);
		const nodeId = await pipe(
			this.last(),
			T.map((a) => a.next()),
			T.getOrElse(() => future.of(new NodeId(0))),
			T.chain(async (nodeId) => {
				return pipe(
					this.storage.stats(stringify(nodeId)),
					T.match(
						() => optional.some(nodeId),
						() => optional.none,
					),
				);
			}),
		);

		return nodeId;
	}

	async getNode(nodeId: NodeId): Future<Optional<KegNode>> {
		const node = await KegNode.fromStorage(nodeId, this.storage);
		return node;
	}

	async writeNode(nodeId: NodeId, node: KegNode): Future<boolean> {
		return node.toStorage(nodeId, this.storage);
	}

	async deleteNode(nodeId: NodeId): Future<boolean> {
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

	async update(): Future<void> {}
}
