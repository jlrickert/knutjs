import { Keg } from './keg';

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
	summary: string;
	hooks: string[];
};

export class IndexEntry {
	static load(data: IndexEntryData): IndexEntry | null {
		return null;
	}

	constructor(private data: IndexEntryData) {}

	save() {}
}

export type HookContext = {
	keg: Keg;
	changedNodes: Node[];
};

export type Hook = (ctx: HookContext) => void;

export const latestChangeHook: Hook = () => {};
