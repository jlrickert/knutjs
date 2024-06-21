import { pipe } from 'fp-ts/lib/function.js';
import { MetaData, MetaFile } from './metaFile.js';
import { stringify } from './utils.js';
import { NodeContent } from './nodeContent.js';
import { TStorage } from './storage/Storage.js';
import { Future } from './internal/future.js';
import { Optional } from './internal/index.js';

export type NodeData = {
	content: NodeContent;
	updated: Date;
	metaData: MetaData;
};

export type NodeOptions = {
	content: string;
	updated?: Date;
	meta?: MetaData;
};

export type NodeId = number;

/**
 * Node represents a handle to a node. For immutable see NodeData
 */
export class KegNode {
	/**
	 * Look in the path for a number.  First number found is returned
	 */
	static parseNodeId(path: string): Optional.TOptional<number> {
		const parts = path.split('/');
		for (const part of parts) {
			const id = Number(part);
			if (!Number.isNaN(id)) {
				return id;
			}
		}
		return null;
	}

	static isNode(obj: any): obj is KegNode {
		return obj instanceof KegNode;
	}

	static async fromStorage(
		id: NodeId,
		storage: TStorage,
	): Future<Optional.TOptional<KegNode>> {
		const nodePath = NodeContent.filePath(id);
		const metaPath = MetaFile.filePath(id);
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
		const node = new KegNode(id, {
			content,
			updated: stats?.mtime ? new Date(stats.mtime) : new Date(),
			metaData: metaData.data,
		});
		return node;
	}

	static readmePath(nodeId: number): string {
		return `${nodeId}/README.md`;
	}

	static metaPath(nodeId: NodeId): string {
		return `${nodeId}/meta.yaml`;
	}

	static async fromContent(options: NodeOptions): Future<NodeData> {
		const content = await NodeContent.fromMarkdown(options.content);
		return {
			content,
			metaData: options.meta ?? new MetaFile().data,
			updated: pipe(
				options.updated,
				Optional.getOrElse(() => new Date()),
			),
		};
	}

	static async zeroNode(): Future<NodeData> {
		const content = await NodeContent.fromMarkdown(
			`
# Sorry, planned but not yet available

This is a filler until I can provide someone better for the link that brought you here. If you are really anxious, consider opening an issue describing why you would like this missing content created before the rest.
				`.trim(),
		);
		const now = new Date();
		const meta = new MetaFile();
		return { content, metaData: meta.data, updated: now };
	}

	static fromData(id: NodeId, data: NodeData): KegNode {
		return new KegNode(id, data);
	}

	public constructor(
		public id: number,
		private data: NodeData,
	) {}

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
		return new MetaFile(this.data.metaData);
	}

	get updated(): Date {
		return this.data.updated;
	}

	set updated(date: Date) {
		this.data.updated = date;
	}

	async updateContent(content: string, now?: Date): Future<void> {
		this.data.content = await NodeContent.fromMarkdown(content);
		this.updated = now ?? new Date();
	}

	async toStorage(storage: TStorage): Future<boolean> {
		const ok = [
			await storage.write(KegNode.readmePath(this.id), this.content),
			await storage.utime(KegNode.readmePath(this.id), {
				mtime: this.updated,
			}),
			await storage.write(
				KegNode.metaPath(this.id),
				stringify(this.meta),
			),
		].reduce((a, b) => a || b, false);

		return ok;
	}
}
