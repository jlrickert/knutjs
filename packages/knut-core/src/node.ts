import { pipe } from 'fp-ts/lib/function.js';
import { MetaFile, Tag } from './metaFile.js';
import { NodeContent } from './nodeContent.js';
import { Storage } from './Storage/index.js';
import { Future, Optional, stringify } from './Utils/index.js';

export class NodeId {
	static parsePath(path: string): Optional.Optional<NodeId> {
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
	meta: MetaFile;
};

export type NodeOptions = {
	content: string;
	updated?: Date;
	meta?: MetaFile;
};

/**
 * Node represents an in memory object containing all data
 * to be consisdered a keg node
 **/
export class KegNode {
	static isNode(obj: any): obj is KegNode {
		return obj instanceof KegNode;
	}

	static async fromStorage(
		nodeId: NodeId,
		storage: Storage.GenericStorage,
	): Future.OptionalFuture<KegNode> {
		const nodePath = NodeContent.filePath(nodeId);
		const metaPath = MetaFile.filePath(nodeId);
		const rawContent = await storage.read(nodePath);
		if (Optional.isNone(rawContent)) {
			return Optional.none;
		}
		const yamlData = await storage.read(metaPath);
		const metaData = yamlData
			? MetaFile.fromYAML(yamlData)
			: new MetaFile();
		const stats = await storage.stats(nodePath);
		if (Optional.isNone(rawContent) && Optional.isNone(stats)) {
			return Optional.none;
		}
		const content = await NodeContent.fromMarkdown(rawContent);
		const node = new KegNode({
			content,
			updated: stats?.mtime ? new Date(stats.mtime) : new Date(),
			meta: metaData,
		});
		return node;
	}

	static parseNodeId(filepath: string): Optional.Optional<string> {
		const parts = filepath.split('/');
		parts.pop();
		const nodeId = parts.pop();
		return nodeId ?? null;
	}

	static metaPath(nodeId: NodeId): string {
		return `${nodeId}/meta.yaml`;
	}

	static async fromContent(options: NodeOptions): Future.Future<KegNode> {
		const content = await NodeContent.fromMarkdown(options.content);
		return new KegNode({
			content,
			meta: options.meta ?? new MetaFile(),
			updated: pipe(
				options.updated,
				Optional.getOrElse(() => new Date()),
			),
		});
	}

	static async zeroNode(): Future.Future<KegNode> {
		const content = await NodeContent.fromMarkdown(
			`
# Sorry, planned but not yet available

This is a filler until I can provide someone better for the link that brought you here. If you are really anxious, consider opening an issue describing why you would like this missing content created before the rest.
				`.trim(),
		);
		const now = new Date();
		const meta = new MetaFile();
		return new KegNode({ content, meta, updated: now });
	}

	private constructor(private data: NodeData) {}

	get title(): string {
		return this.data.content.title ?? '';
	}

	set title(value: string) {
		this.data.content.title = value;
	}

	get content(): string {
		return stringify(this.data.content);
	}

	get meta(): MetaFile {
		return this.data.meta;
	}

	get updated(): Date {
		return this.data.updated;
	}

	set updated(date: Date) {
		this.data.updated = date;
	}

	async updateContent(content: string, now?: Date): Future.Future<void> {
		this.data.content = await NodeContent.fromMarkdown(content);
		this.updated = now ?? new Date();
	}

	async toStorage(
		nodeId: NodeId,
		storage: Storage.GenericStorage,
	): Future.Future<boolean> {
		const ok = [
			await storage.write(nodeId.getReadmePath(), this.content),
			await storage.utime(nodeId.getReadmePath(), {
				mtime: this.updated,
			}),
			await storage.write(nodeId.getMetaPath(), stringify(this.meta)),
		].reduce((a, b) => a || b, false);

		return ok;
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
