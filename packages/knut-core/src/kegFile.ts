import * as YAML from 'yaml';
import { MY_JSON, currentDate, stringify } from './utils.js';
import { NodeId } from './node.js';
import { KegStorage } from './kegStorage.js';

export type KegVersion = '2023-01';

/**
 * Plain old data representing an Index. This data is found in the **keg**
 * file.
 **/
export type IndexEntryData = {
	/**
	 * file relative to the keg file. By convention this will point to a file
	 * in the dex directory.
	 */
	file: string;
	/**
	 * Summary for the index
	 **/
	summary: string;
	/**
	 * name of the indexer to use
	 **/
	name: string;
	[keg: string]: MY_JSON;
};

export type SearchEntryData = {
	name: string;
	defaultParams: MY_JSON;
};

/**
 * Plain old data representing a keg
 **/
export type KegFileData = {
	$schema: 'https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json';
	/**
	 * last time the index has been updated.
	 **/
	updated?: string;
	kegv?: KegVersion;
	title?: string;
	url?: string;
	linkfmt?: string;
	creator?: string;
	state?: string;
	summary?: string;
	defaultSearch?: string;
	searches?: SearchEntryData[];
	indexes?: IndexEntryData[];
};

export class KegFile {
	static filePath() {
		return 'keg';
	}

	/**
	 * Load a keg file for the given path
	 */
	static async fromStorage(storage: KegStorage): Promise<KegFile | null> {
		const kegdata = await storage.read('keg');
		if (!kegdata) {
			return null;
		}
		return KegFile.fromYAML(kegdata);
	}

	static fromYAML(yaml: string): KegFile {
		const data = YAML.parse(yaml);
		return new KegFile(data);
	}

	static create(): KegFile {
		return new KegFile({
			$schema:
				'https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json',
			updated: currentDate(),
			kegv: '2023-01',
			state: 'living',
		});
	}

	private constructor(public readonly data: KegFileData) {}

	get updated(): Date | null {
		const u = this.data.updated ?? null;
		return u !== null ? new Date(u) : u;
	}

	set updated(value: Date) {
		this.data.updated = stringify(value);
	}

	*getIndexes() {
		for (const entry of this.data.indexes ?? []) {
			yield entry satisfies IndexEntryData;
		}
	}

	async writeTo(storage: KegStorage): Promise<boolean> {
		return await storage.write('keg', stringify(this));
	}

	update(f: (data: KegFileData) => void): void {
		f(this.data);
	}

	getAuthor(): string | null {
		return this.data.creator ?? null;
	}

	getLink(nodeId: NodeId): string | null {
		const linkfmt = this.data.linkfmt;
		return linkfmt ? linkfmt.replace('{{id}}', nodeId.stringify()) : null;
	}

	toYAML(): string {
		const schemaLine =
			'# yaml-language-server: $schema=https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json';
		const content = YAML.stringify(this.data);
		return [schemaLine, content].join('\n');
	}

	toJSON(pretty?: boolean): string {
		return JSON.stringify(this.data, undefined, pretty ? 2 : undefined);
	}

	stringify(): string {
		return this.toYAML();
	}
}
