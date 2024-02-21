import { pipe } from 'fp-ts/lib/function.js';
import { Dex } from './dex.js';
import { EnvStorage } from './envStorage.js';
import { Optional, optional } from './internal/optional.js';
import { Future } from './internal/future.js';
import { KegFile } from './kegFile.js';
import { KegStorage } from './kegStorage.js';
import { KegNode, NodeId } from './node.js';
import { fromUri } from './storage/storageUtils.js';
import { collectAsync } from './utils.js';

export type CreateNodeOptions = {
	content: string;
	tags?: string;
};

export class Keg {
	static async fromUri(uri: string, env: EnvStorage): Future<Optional<Keg>> {
		const keg = pipe(
			uri,
			fromUri,
			optional.map(KegStorage.fromStorage),
			optional.map((s) => Keg.fromStorage(s, env)),
		);
		return keg;
	}
	static async fromStorage(
		storage: KegStorage,
		env: EnvStorage,
	): Future<Optional<Keg>> {
		const kegFile = await KegFile.fromStorage(storage);
		const dex = await Dex.fromStorage(storage);
		if (!kegFile || !dex) {
			return optional.none;
		}
		const keg = new Keg(kegFile, dex, storage);
		return keg;
	}

	static async create(storage: KegStorage, env: EnvStorage): Future<Keg> {
		const kegFile =
			(await KegFile.fromStorage(storage)) ?? KegFile.default();
		const dex = (await Dex.fromStorage(storage)) ?? new Dex();
		const keg = new Keg(kegFile, dex, storage);
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
		const nodeId = nodeList.length > 0 ? nodeList[0] : null;
		return nodeId;
	}

	async getNode(nodeId: NodeId): Future<Optional<KegNode>> {
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

	async update(): Future<void> {}
}
