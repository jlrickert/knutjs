import { EventEmitter } from 'events';
import { Meta, Tag } from './meta.js';
import { Storage } from './storage.js';
import { now } from './utils.js';
import { Markdown } from './markdown.js';

export type NodeId = string;

export type NodeData = {
	title: string;
	content: string;
	updated: string;
	meta: Meta;
};

export class Node extends EventEmitter {
	private data: NodeData;

	static isNode(obj: any): obj is Node {
		return obj instanceof Node;
	}

	static async load(nodeId: string, storage: Storage): Promise<Node | null> {
		const nodePath = Node.nodePath(nodeId);
		const metaPath = Meta.metaPath(nodeId);
		const content = await storage.read(nodePath);
		const yaml = await storage.read(metaPath);
		const meta = yaml ? Meta.fromYAML(yaml) : new Meta();
		const stats = await storage.stats(nodePath);
		if (!content || !stats || !stats) {
			return null;
		}
		const node = new Node({ content, updated: stats.mtime, meta });
		return node;
	}

	static nodePath(nodeId: string): string {
		return `${nodeId}/README.md`;
	}

	static parseNodeId(filepath: string): string | null {
		const parts = filepath.split('/');
		parts.pop();
		const nodeId = parts.pop();
		return nodeId ?? null;
	}

	static metaPath(nodeId: string): string {
		return `${nodeId}/meta.yaml`;
	}

	private mdAst: Markdown;
	constructor({
		content,
		updated: updatedAt,
		meta,
	}: {
		content: string;
		updated: string;
		meta: Meta;
	}) {
		super();
		this.mdAst = Markdown.parse(content);
		this.data = {
			updated: updatedAt,
			title: this.mdAst.getTitle() ?? '',
			content: content,
			meta: meta,
		};
	}

	get meta(): Meta {
		return this.data.meta;
	}

	get title(): string {
		return this.data.title;
	}

	get updatedAt(): string {
		return this.data.updated;
	}

	updateContent(content: string): void {
		this.data.content = content;
		this.mdAst = Markdown.parse(content);
		this.data.updated = now('Y-m-D H:M');

		this.emit('update', {
			node: this,
		});
	}

	updateMeta(f: Meta | ((meta: Meta) => void)): void {
		if (f instanceof Meta) {
			this.data.meta = f;
		} else {
			f(this.data.meta);
		}
	}

	addTag(tag: Tag): void {
		this.data.meta.addTag(tag);
	}

	addDate(datetime: string): void {
		this.data.meta.add('date', datetime);
	}

	stringify(): string {
		return this.data.content;
	}
}
