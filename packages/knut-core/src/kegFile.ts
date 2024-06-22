import * as YAML from 'yaml';
import { NodeId } from './node.js';
import { pipe } from 'fp-ts/lib/function.js';
import { Storage } from './Storage/index.js';
import { currentDate, Future, Json, Optional, stringify } from './Utils/index.js';

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
	[keg: string]: Json.Json;
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
	indexes?: IndexEntryData[];
};

export class KegFile {
	/**
	 * Load a keg file for the given path
	 */
	static async fromStorage(
		storage: Storage.GenericStorage,
	): Future.OptionalFuture<KegFile> {
		const kegdata = pipe(
			await storage.read('keg'),
			Optional.map(KegFile.fromYAML),
		);
		return kegdata;
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

	private constructor(public readonly data: KegFileData) {}

	*getIndexes() {
		const entries: IndexEntryData[] = [];
		for (const entry of this.data.indexes ?? []) {
			entries.push(entry);
			yield entry satisfies IndexEntryData;
		}
		return entries;
	}

	async toStorage(storage: Storage.GenericStorage): Future.Future<boolean> {
		return await storage.write('keg', stringify(this));
	}

	update(f: (data: KegFileData) => void): void {
		f(this.data);
	}

	getAuthor(): Optional.Optional<string> {
		return this.data.creator ?? null;
	}

	getLink(nodeId: NodeId): Optional.Optional<string> {
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
