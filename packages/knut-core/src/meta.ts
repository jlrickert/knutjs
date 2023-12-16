import invariant from 'tiny-invariant';
import { JSONObject, type JSON, unsafeCoerce } from './utils';

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
	/**
	 * Looks for the **meta** file in the nodepath. Typically, this will be in
	 * yaml format. **meta** should have a yaml, or json format.
	 **/
	static load(nodepath: string): Meta | null {
		throw new Error('Not implemented');
	}

	constructor(private data: MetaData) {
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

	add(key: string, value: JSON) {
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

	remove(key: string) {
		delete this.data[key];
	}

	exportData(format: 'yaml' | 'json'): string {
		return JSON.stringify(this.data);
	}
}
