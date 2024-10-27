import { Future, Optional, pipe, Result, stringify } from './Utils/index.js';
import { Json, NodeId, Yaml } from './Data/index.js';
import { KnutErrorScopeMap } from './Data/KnutError.js';
import { Store } from './Store/index.js';

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
export type KegConfigData = {
	/**
	 * last time the index has been updated.
	 **/
	updated?: Date;
	kegv?: KegVersion;
	title?: string;
	url?: string;
	linkfmt?: string;
	creator?: string;
	state?: string;
	summary?: string;
	indexes?: IndexEntryData[];
};

export class KegConfig {
	static async hasConfig(storage: Store.Store) {
		return Result.isOk(await storage.stats('keg'));
	}

	/**
	 * Load a keg file for the given path
	 */
	static async fromStorage(
		storage: Store.Store,
	): Future.FutureResult<
		KegConfig,
		KnutErrorScopeMap['YAML' | 'JSON' | 'STORAGE']
	> {
		const kegdata = pipe(
			await storage.read('keg'),
			Result.chain((yaml) => {
				return KegConfig.fromYaml(yaml);
			}),
		);
		return kegdata;
	}

	static fromYaml(yaml: string) {
		return Result.map(
			Yaml.parse<KegConfigData>(yaml),
			(data) => new KegConfig(data),
		);
	}

	static fromJson(json: string) {
		return Result.map(
			Json.parse<KegConfigData>(json),
			(data) => new KegConfig(data),
		);
	}

	static default(): KegConfig {
		return new KegConfig({
			// $schema:
			// 	'https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json',
			updated: new Date(),
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
		const kegFile = KegConfig.default();
		kegFile.data.url = options?.url;
		kegFile.data.linkfmt = options?.linkfmt;
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

	public data: KegConfigData;
	private constructor(data: KegConfigData) {
		this.data = data;
	}

	*getIndexes() {
		const entries: IndexEntryData[] = [];
		for (const entry of this.data.indexes ?? []) {
			entries.push(entry);
			yield entry satisfies IndexEntryData;
		}
		return entries;
	}

	upsertIndex(index: IndexEntryData) {
		if (this.data.indexes === undefined) {
			this.data.indexes = [];
		}
		const i = this.data.indexes?.findIndex((a) => a.name === index.name);
		if (i < 0) {
			this.data.indexes.push(index);
			return;
		}
		this.data.indexes[i] = { ...this.data.indexes[i], index };
	}

	async toStorage(storage: Store.Store) {
		return await storage.write('keg', this.stringify());
	}

	getCreator(): Optional.Optional<string> {
		return this.data.creator ?? null;
	}

	setCreator(value: string): KegConfig {
		this.data.creator = value;
		return this;
	}

	getLink(nodeId: NodeId.NodeId): Optional.Optional<string> {
		const linkfmt = this.data.linkfmt;
		return linkfmt
			? linkfmt.replace('{{id}}', NodeId.stringify(nodeId))
			: null;
	}

	toYaml(options?: Yaml.YamlStringifyOptions): string {
		const { updated, ...data } = this.data;
		const schemaLine =
			'# yaml-language-server: $schema=https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json';
		const content = Yaml.stringify(
			{ updated: stringify(updated ?? new Date()), ...data },
			options,
		);
		return [schemaLine, content].join('\n');
	}

	toJson(options?: Json.JsonStringifyOptions): string {
		const { updated, ...data } = this.data;
		return Json.stringify(
			{
				$schema:
					'https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json',
				updated: stringify(updated ?? new Date()),
				...data,
			},
			options,
		);
	}

	stringify(): string {
		return this.toYaml();
	}
}
