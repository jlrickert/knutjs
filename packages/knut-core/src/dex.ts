import { Node, NodeId } from './node';

export type DexEntryData = {
	id: NodeId;
	title: string;
	updated: string;
};

export class DexEntry {
	constructor() {}
}

export class Dex {
	private entries: DexEntry[];
	static load(): Dex | null {
		return null;
	}

	private constructor() {
		this.entries = [];
	}

	addNode(node: Node): void {}
	removeNode(nodeId: string): void {}
}
