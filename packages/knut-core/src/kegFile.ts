import * as YAML from 'yaml';
import { IndexEntry, type IndexEntryData } from './indexes.js';
import { KegStorage } from './storage/storage.js';
import { createId, currentDate } from './utils.js';
import { NodeId } from './node.js';

export type KegVersion = '2023-01';

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
	indexes?: IndexEntryData[];
};

export class KegFile {
	/**
	 * Load a keg file for the given path
	 */
	static async load(storage: KegStorage): Promise<KegFile | null> {
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

	static default(): KegFile {
		return new KegFile({
			$schema:
				'https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json',
			updated: currentDate(),
			kegv: '2023-01',
			state: 'living',
		});
	}

	static getFilepath(): string {
		return 'keg';
	}

	getFilepath(): string {
		return 'keg';
	}

	private constructor(private data: KegFileData) {}

	update(f: (data: KegFileData) => void): void {
		f(this.data);
	}

	getNodeId(): NodeId {
		const id = createId({ count: 5, postfix: 'A' });
		return new NodeId(id);
	}

	getAuthor(): string | null {
		return this.data.creator ?? null;
	}

	getLink(nodeId: NodeId): string | null {
		const linkfmt = this.data.linkfmt;
		return linkfmt ? linkfmt.replace('{{id}}', nodeId.stringify()) : null;
	}

	getIndexList(): IndexEntry[] | null {
		const indexDataList = this.data.indexes ?? [];
		const indexList: IndexEntry[] = [];
		for (const data of indexDataList) {
			const index = IndexEntry.load(data);
			if (!index) {
				return null;
			}
			indexList.push(index);
		}
		return indexList;
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
		return this.toJSON();
	}
}
