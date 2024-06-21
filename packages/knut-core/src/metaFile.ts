import { Array } from 'effect';
import * as YAML from 'yaml';
import invariant from 'tiny-invariant';
import { JsonObject, Json, unsafeCoerce } from './utils.js';
import { NodeId } from './KegNode.js';

export type MetaData = JsonObject & {
	tags?: Tag[];
};

export type Tag = string;

const makeTag = (value: string): Tag => {
	if (value.startsWith('#')) {
		return value as Tag;
	}
	return `#${makeTag}`;
};

export class MetaFile {
	static fromYAML(yaml: string): MetaFile {
		const data = YAML.parse(yaml);
		const meta = new MetaFile(data);
		return meta;
	}

	static fromJSON(json: string): MetaFile {
		const data = JSON.parse(json);
		const meta = new MetaFile(data);
		return meta;
	}

	static filePath(nodeId: NodeId): string {
		return `${nodeId.stringify()}/meta.yaml`;
	}

	public data: MetaData;

	constructor(data?: MetaData) {
		this.data = data ?? {};
		// Ensure that tags is a set of at least 1 item or doesn't exist
		if (this.data.tags && !Array.isArray(this.data.tags)) {
			delete this.data['tags'];
		}
	}

	concat = (other: MetaFile) => {
		return new MetaFile({
			...this.data,
			...other.data,
			tags: Array.dedupeWith(
				[...this.getTags(), ...other.getTags()],
				(a, b) => a === b,
			),
		});
	};

	/**
	 * Add tag to the propery tag. This will add a #
	 **/
	addTag = (tag: Tag) => {
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
	};

	removeTag = (tag: Tag) => {
		if (!this.data.tags) {
			return;
		}
		invariant(
			unsafeCoerce<{ tags: string[] }>(this.data),
			'Expect to be a list of strings',
		);
		this.data.tags = this.data.tags.filter((a) => a !== tag);
	};

	getTags = (): readonly Tag[] => {
		return this.data.tags ?? [];
	};

	add = (key: string, value: Json) => {
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
	};

	get = <T = unknown>(key: string, _default?: T): T => {
		const value = this.data[key];
		return (value ?? _default) as T;
	};

	addDate = (datetime: string): void => {
		this.add('date', datetime);
	};

	remove = (key: string) => {
		delete this.data[key];
	};

	toJSON = (): string => JSON.stringify(this.data);
	toYAML = (): string => YAML.stringify(this.data);
	stringify = () => this.toYAML();
}
