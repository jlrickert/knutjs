import { EventEmitter } from 'events';
import { Meta as MetaFile, Tag } from './metaFile.js';
import { KegStorage } from './storage/storage.js';
import { Stringer, now } from './utils.js';
import { NodeContent } from './nodeContent.js';

type PartialOrder<T> = {
	lt: (other: T) => boolean;
	gt: (other: T) => boolean;
};

type Equality<T> = {
	equals: (other: T) => boolean;
};

type Order<T> = (PartialOrder<T> & Equality<T>) & {
	lte: (other: T) => boolean;
	gte: (other: T) => boolean;
};

export class NodeId implements Stringer, Order<NodeId> {
	constructor(public readonly id: string) {}

	lt(other: NodeId): boolean {
		return Number(this.id) < Number(other.id);
	}

	lte(other: NodeId): boolean {
		return Number(this.id) <= Number(other.id);
	}

	gt(other: NodeId): boolean {
		return Number(this.id) > Number(other.id);
	}

	gte(other: NodeId): boolean {
		return Number(this.id) >= Number(other.id);
	}

	equals(other: NodeId): boolean {
		return this.id === other.id;
	}

	getMetaPath(): string {
		return `${this.id}/meta.yaml`;
	}

	getReadmePath(): string {
		return `${this.id}/README.md`;
	}

	stringify(): string {
		return this.id;
	}
}

export type NodeData = {
	content: NodeContent;
	updated: string;
	meta: MetaFile;
};

export type NodeOptions = {
	content: string;
	updated: string;
	meta?: MetaFile;
};

/**
 * Node represents an in memory object containing all data
 * to be consisdered a keg node
 **/
export class Node extends EventEmitter {
	static isNode(obj: any): obj is Node {
		return obj instanceof Node;
	}

	static async load(
		nodeId: NodeId,
		storage: KegStorage,
	): Promise<Node | null> {
		const nodePath = NodeContent.filePath(nodeId);
		const metaPath = MetaFile.filePath(nodeId);
		const contentData = await storage.read(nodePath);
		if (!contentData) {
			return null;
		}
		const yamlData = await storage.read(metaPath);
		const metaData = yamlData
			? MetaFile.fromYAML(yamlData)
			: new MetaFile();
		const stats = await storage.stats(nodePath);
		if (!contentData || !stats) {
			return null;
		}
		const content = await NodeContent.fromMarkdown(contentData);
		const node = new Node({
			content,
			updated: stats.mtime,
			meta: metaData,
		});
		return node;
	}

	static parseNodeId(filepath: string): string | null {
		const parts = filepath.split('/');
		parts.pop();
		const nodeId = parts.pop();
		return nodeId ?? null;
	}

	static metaPath(nodeId: NodeId): string {
		return `${nodeId}/meta.yaml`;
	}

	static async fromContent(options: NodeOptions): Promise<Node> {
		const content = await NodeContent.fromMarkdown(options.content);
		return new Node({
			content,
			meta: options.meta ?? new MetaFile(),
			updated: options.updated,
		});
	}

	private constructor(private data: NodeData) {
		super();
	}

	get title(): string | null {
		return this.content.title;
	}

	set title(value: string) {
		this.content.title = value;
	}

	get content(): NodeContent {
		return this.data.content;
	}

	get meta(): MetaFile {
		return this.data.meta;
	}

	get updated(): string {
		return this.data.updated;
	}

	async updateContent(content: string): Promise<void> {
		this.data.content = await NodeContent.fromMarkdown(content);
		this.data.updated = now('Y-m-D H:M');

		this.emit('update', {
			node: this,
		});
	}

	updateMeta(f: MetaFile | ((meta: MetaFile) => void)): void {
		if (f instanceof MetaFile) {
			this.data.meta = f;
		} else {
			f(this.data.meta);
		}
	}

	addTag(tag: Tag): void {
		this.data.meta.addTag(tag);
	}

	getTags(): readonly string[] {
		return this.data.meta.getTags();
	}

	addDate(datetime: string): void {
		this.data.meta.add('date', datetime);
	}
}
