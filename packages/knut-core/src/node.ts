import { EventEmitter } from 'events';
import { Meta, MetaData, Tag } from './meta';
import { createId } from './utils';

export type NodeId = string;

export type NodeOptions = {
	nodeId: NodeId;
	content: string;
	meta: MetaData;
};

export class Node extends EventEmitter {
	private _id: string;
	private _title: string = '';
	/**
	 * Content is in markdown format
	 */
	content: string = '';
	/**
	 * List of other content in the node other than README.md and meta.yaml
	 */
	items: string[] = [];
	meta: Meta;

	static load(nodepath: string): Node | null {
		return null;
	}

	static create(options: NodeOptions) {
		return new Node(options);
	}

	constructor(options: NodeOptions) {
		super();
		this._id = options.nodeId;
		this.content = options.content;
		this.meta = new Meta({});
	}

	get id() {
		return this._id;
	}

	get title(): string {
		return this._title;
	}

	set title(value: string) {
		this._id = value;
	}

	update(content: string): void {
		this.content = content;
		const firstNewline = content.indexOf('\n');
		const index = firstNewline > 0 ? firstNewline : this.content.length;
		this._title = content.slice(0, index);
		this.emit('update', {
			nodeId: this._id,
		});
	}

	save(kegpath: string): void {
		this.emit('save', {
			kegpath,
			nodeId: this.id,
		});
	}

	addTag(tag: Tag): void {
		this.meta.addTag(tag);
	}

	addDate(datetime: string): void {
		this.meta.add('date', datetime);
	}
}
