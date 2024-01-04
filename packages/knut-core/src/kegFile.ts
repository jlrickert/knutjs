import * as YAML from 'yaml';
import { IndexEntry, type IndexEntryData } from './indexes.js';
import { Storage } from './storage.js';
import { createId, currentDate } from './utils.js';
import { NodeId } from './node.js';

export type KegVersion = '2023-01';

/**
 * Plain old data representing a keg
 **/
export type KegFileData = {
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
	 * Finds the nearest keg file. Here is where it will look for in order
	 * of higher precendence to lowest:
	 *
	 * - $KEG_CURRENT/keg
	 * - $KEG_CURRENT/docs/keg
	 * - ./keg
	 * - ./docs/keg
	 * - <git repo>/keg
	 * - <git repo>/docs/keg
	 */
	static findNearest(): string {
		return '';
	}

	/**
	 * Load a keg file for the given path
	 */
	static async load(storage: Storage): Promise<KegFile | null> {
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
			updated: currentDate(),
			kegv: '2023-01',
			state: 'living',
		});
	}

	private constructor(private data: KegFileData) {}

	update(f: (data: KegFileData) => void): void {
		f(this.data);
	}

	getNodeId(): NodeId {
		return createId({ count: 5, postfix: 'A' });
	}

	getLink(nodeId: NodeId): string | null {
		const linkfmt = this.data.linkfmt;
		return linkfmt ? linkfmt.replace('{{id}}', nodeId) : null;
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
		return YAML.stringify(this.data);
	}

	toJSON(pretty?: boolean): string {
		return JSON.stringify(this.data, undefined, pretty ? 2 : undefined);
	}
}
