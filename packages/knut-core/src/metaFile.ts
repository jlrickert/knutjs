import * as YAML from 'yaml';
import invariant from 'tiny-invariant';
import { JSONObject, JSON as MY_JSON, unsafeCoerce } from './utils.js';
import { NodeId } from './node.js';

export type MetaData = JSONObject & {
	tags?: Tag[];
};

export type Tag = string;

const makeTag = (value: string): Tag => {
	if (value.startsWith('#')) {
		return value as Tag;
	}
	return `#${makeTag}`;
};

export class Meta {
	static fromYAML(yaml: string): Meta {
		const data = YAML.parse(yaml);
		const meta = new Meta(data);
		return meta;
	}

	static filePath(nodeId: NodeId): string {
		return `${nodeId.stringify()}/meta.yaml`;
	}

	private data: MetaData;

	constructor(data?: MetaData) {
		this.data = data ?? {};
		// Ensure that tags is a set of at least 1 item or doesn't exist
		if (this.data.tags && !Array.isArray(this.data.tags)) {
			delete this.data['tags'];
		}
	}

	/**
	 * Add tag to the propery tag. This will add a #
	 **/
	addTag(tag: Tag) {
		// FIXM(jared): undefined behavior if tags is not a list of strings
		if (!Array.isArray(this.data.tags)) {
			this.data['tags'] = [];
		}
		invariant(
			unsafeCoerce<{ tags: string[] }>(this.data),
			'Expect to be a list of strings',
		);

		if (this.data.tags.includes(tag)) {
			return;
		}
		this.data.tags.push(tag);
	}

	removeTag(tag: Tag) {
		if (!this.data.tags) {
			return;
		}
		invariant(
			unsafeCoerce<{ tags: string[] }>(this.data),
			'Expect to be a list of strings',
		);
		this.data.tags = this.data.tags.filter((a) => a !== tag);
	}

	getTags(): readonly Tag[] {
		return this.data.tags ?? [];
	}

	add(key: string, value: MY_JSON) {
		if (key === 'tags') {
			if (!Array.isArray(value)) {
				this.data['tags'] = [];
			}
			invariant(
				unsafeCoerce<string[]>(value),
				'Expect to be a list of strings',
			);
			for (const tag of value) {
				this.addTag(makeTag(tag));
			}
			return;
		}

		this.data[key] = value;
	}

	get(key: string): MY_JSON {
		return this.data[key] ?? null;
	}

	addDate(datetime: string): void {
		this.add('date', datetime);
	}

	getDate(): string | null {
		const date = this.get('date');
		if (typeof date === 'string' || typeof date === 'number') {
			return new Date(date).toISOString();
		}
		return null;
	}

	remove(key: string) {
		delete this.data[key];
	}

	export(): MY_JSON {
		return { ...this.data };
	}

	toJSON(): MY_JSON {
		return JSON.stringify(this.data);
	}

	toYAML(): string {
		return YAML.stringify(this.data);
	}

	stringify() {
		return this.toYAML();
	}
}
