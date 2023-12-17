import { Dex } from './dex';
import { IndexEntry, IndexEntryData } from './indexes';
import { currentDate } from './utils';

export type KegVersion = '2023-01';

/**
 * Plain old data representing a keg
 **/
type KegData = {
	/**
	 * last time the index has been updated.
	 **/
	updated?: string;
	kegv?: KegVersion;
	title?: string;
	url?: string;
	creator?: string;
	state?: string;
	summary?: string;
	indexes?: IndexEntryData[];
};

export class Keg {
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
	static load(kegpath: string): Keg | null {
		return null;
	}

	static default(): Keg {
		return new Keg({
			updated: currentDate(),
			kegv: '2023-01',
			state: 'living',
		});
	}

	private constructor(readonly data: KegData) {}

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

	getDex(): Dex | null {
		return null;
	}

	exportData(): string {
		return '';
	}
}
