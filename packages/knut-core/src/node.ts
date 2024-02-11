import { EventEmitter } from 'events';
import { MetaFile as MetaFile, Tag } from './metaFile.js';
import { stringify } from './utils.js';
import { NodeContent } from './nodeContent.js';
import { KegStorage } from './kegStorage.js';
import { TimeLike } from 'fs';

export class NodeId {
	static parsePath(path: string): NodeId | null {
		const parts = path.split('/');
		for (const part of parts) {
			const id = Number(part);
			if (!Number.isNaN(id)) {
				return new NodeId(id);
			}
		}
		return null;
	}

	constructor(public readonly id: number) {}

	next(): NodeId {
		return new NodeId(Number(this.id) + 1);
	}

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

	eq(other: NodeId): boolean {
		return this.id === other.id;
	}

	getMetaPath(): string {
		return `${this.id}/meta.yaml`;
	}

	getReadmePath(): string {
		return `${this.id}/README.md`;
	}

	stringify(): string {
		return String(this.id);
	}
}

export type NodeData = {
	content: NodeContent;
	updated: Date;
	created: Date;
	meta: MetaFile;
};

export type NodeOptions = {
	content: string;
	updated: Date;
	created: Date;
	meta?: MetaFile;
};

/**
 * Node represents an in memory object containing all data
 * to be consisdered a keg node
 **/
export class KegNode extends EventEmitter {
	static isNode(obj: any): obj is KegNode {
		return obj instanceof KegNode;
	}

	static async fromStorage(
		nodeId: NodeId,
		storage: KegStorage,
	): Promise<KegNode | null> {
		const nodePath = NodeContent.filePath(nodeId);
		const metaPath = MetaFile.filePath(nodeId);
		const rawContent = await storage.read(nodePath);
		if (rawContent === null) {
			return null;
		}
		const yamlData = await storage.read(metaPath);
		const metaData = yamlData
			? MetaFile.fromYAML(yamlData)
			: new MetaFile();
		const stats = await storage.stats(nodePath);
		if (stats === null) {
			return null;
		}
		const content = await NodeContent.fromMarkdown(rawContent);
		const now = new Date();
		const node = new KegNode({
			content,
			updated: stats?.mtime ? new Date(stats.mtime) : now,
			created: stats?.btime ? new Date(stats.btime) : now,
			meta: metaData,
		});
		return node;
	}

	static async create(): Promise<KegNode> {
		const now = new Date();
		return new KegNode({
			content: await NodeContent.fromMarkdown(''),
			created: now,
			updated: now,
			meta: new MetaFile(),
		});
	}

	/**
	 * The Zero node is typically node 0 that content may point to when content
	 * is planned but not yet available.
	 **/
	static async zeroNode(): Promise<KegNode> {
		const node = await KegNode.create();
		await node.setContent(
			`
# Sorry, planned but not yet available

This is a filler until I can provide someone better for the link that brought you here. If you are really anxious, consider opening an issue describing why you would like this missing content created before the rest.
		`.trim(),
		);
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

	static async fromContent(options: NodeOptions): Promise<KegNode> {
		const content = await NodeContent.fromMarkdown(options.content);
		return new KegNode({
			content,
			meta: options.meta ?? new MetaFile(),
			updated: options.updated,
			created: options.created,
		});
	}

	private constructor(private data: NodeData) {
		super();
	}

	get title(): string {
		return this.data.content.title ?? '';
	}

	set title(value: string) {
		this.data.content.title = value;
	}

	get content(): string {
		return stringify(this.data.content);
	}

	async setContent(markdown: string): Promise<void> {
		this.data.content = await NodeContent.fromMarkdown(markdown);
	}

	get meta(): MetaFile {
		return this.data.meta;
	}

	get updated(): Date {
		return this.data.updated;
	}

	set updated(value: TimeLike) {
		this.data.updated = new Date(value);
	}

	get created(): Date {
		return this.data.created;
	}

	set created(value: TimeLike) {
		this.data.created = new Date(value);
	}

	async updateContent(content: string): Promise<void> {
		this.data.content = await NodeContent.fromMarkdown(content);
		this.data.updated = new Date();

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
