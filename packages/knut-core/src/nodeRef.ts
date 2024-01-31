import { Keg } from './keg.js';
import { KegNode, NodeId } from './node.js';
import { stringify } from './utils.js';

export type KegNodeArguments = {
	keg: Keg;
	nodeId: NodeId;
};

export class KegNodeRef {
	public readonly keg: Keg;
	public readonly nodeId: NodeId;

	constructor({ nodeId, keg }: KegNodeArguments) {
		this.keg = keg;
		this.nodeId = nodeId;
	}

	async getNode(): Promise<KegNode | null> {
		const node = await KegNode.fromStorage(this.nodeId, this.keg.storage);
		return node;
	}

	async getContent(): Promise<string | null> {
		const node = await this.getNode();
		if (!node) {
			return null;
		}
		return stringify(node.content);
	}
}
