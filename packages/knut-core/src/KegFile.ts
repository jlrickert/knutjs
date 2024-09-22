import { Storage } from './Storage/index.js';
import {
	currentDate,
	Future,
	Optional,
	pipe,
	Result,
	stringify,
} from './Utils/index.js';
import { Json, NodeId, Yaml } from './Data/index.js';
import { KnutErrorScopeMap } from './Data/KnutError.js';

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
	 */
	summary: string;
	[keg: string]: Json.Json;
};

/**
 * Plain old data representing a keg
 */
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
	 * Load a keg file for the given path
	 */
	static async fromStorage(
		storage: Storage.GenericStorage,
	): Future.FutureResult<
		KegFile,
		KnutErrorScopeMap['YAML' | 'JSON' | 'STORAGE']
	> {
		const kegdata = pipe(
			await storage.read('keg'),
			Result.chain((a) => {
				return KegFile.fromYaml(a);
			}),
		);
		return kegdata;
	}

	static fromYaml(yaml: string) {
		return Result.map(
			Yaml.parse<KegFileData>(yaml),
			(data) => new KegFile(data),
		);
	}

	static fromJson(json: string) {
		return Result.map(
			Json.parse<KegFileData>(json),
			(data) => new KegFile(data),
		);
	}

	static default(): KegFile {
		return new KegFile({
			// $schema:
			// 	'https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json',
			updated: currentDate(),
			kegv: '2023-01',
			state: 'living',
		});
	}

	static create(options?: {
		title?: string;
		url?: string;
		linkfmt?: string;
		creator?: string;
		state?: string;
		summary?: string;
	}) {
		const kegFile = KegFile.default();
		kegFile._data.url = options?.url;
		kegFile._data.linkfmt = options?.linkfmt;
		kegFile.upsertIndex({
			file: 'dex/changes.md',
			summary: 'latest changes',
		});
		kegFile.upsertIndex({
			file: 'dex/nodes.tsv',
			summary: 'all nodes by id',
		});
		kegFile.upsertIndex({
			file: 'dex/tags',
			summary: 'tags index',
		});
		return kegFile;
	}

	private constructor(private _data: KegFileData) {}

	public get data(): Readonly<KegFileData> {
		return this._data;
	}

	*getIndexes() {
		const entries: IndexEntryData[] = [];
		for (const entry of this._data.indexes ?? []) {
			entries.push(entry);
			yield entry satisfies IndexEntryData;
		}
		return entries;
	}

	upsertIndex(index: IndexEntryData) {
		if (this._data.indexes === undefined) {
			this._data.indexes = [];
		}
		const i = this._data.indexes?.findIndex((a) => a.name === index.name);
		if (i < 0) {
			this._data.indexes.push(index);
			return;
		}
		this._data.indexes[i] = { ...this._data.indexes[i], index };
	}

	async toStorage(storage: Storage.GenericStorage) {
		return await storage.write('keg', stringify(this));
	}

	getCreator(): Optional.Optional<string> {
		return this._data.creator ?? null;
	}

	setCreator(value: string): KegFile {
		this._data.creator = value;
		return this;
	}

	getLink(nodeId: NodeId.NodeId): Optional.Optional<string> {
		const linkfmt = this._data.linkfmt;
		return linkfmt
			? linkfmt.replace('{{id}}', NodeId.stringify(nodeId))
			: null;
	}

	toYaml(options?: Yaml.YamlStringifyOptions): string {
		const schemaLine =
			'# yaml-language-server: $schema=https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json';
		const content = Yaml.stringify(this._data, options);
		return [schemaLine, content].join('\n');
	}

	toJson(options?: Json.JsonStringifyOptions): string {
		return Json.stringify(
			{
				$schema:
					'https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json',
				...this._data,
			},
			options,
		);
	}

	stringify(): string {
		return this.toYaml();
	}
}
