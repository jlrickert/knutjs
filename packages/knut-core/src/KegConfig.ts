import { Array, Option } from 'effect';
import { pipe } from 'fp-ts/lib/function.js';
import * as YAML from 'yaml';
import { Json, deepCopy, stringify } from './utils.js';
import { NodeId } from './KegNode.js';
import { TStorage } from './storage/Storage.js';
import { Future, Optional } from './internal/index.js';

export type KegVersion = '2023-01';
const defaultSchema =
	'https://raw.githubusercontent.com/jlrickert/knutjs/main/packages/knut-core/kegSchema.json';

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
	summary?: string;

	/**
	 * Name of the plugin to use.
	 **/
	plugin?: string;

	args?: Json;
};

export type KegPluginData = {
	/**
	 * Name of the plugin
	 */
	name: string;
	/**
	 * Whether the plugin is enabled or not
	 */
	enable: boolean;
};

/**
 * Plain old data representing the data in the *keg* file. This should match
 * kegSchema.json file
 */
export type KegConfigData = {
	$schema: typeof defaultSchema;
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
	format?: 'json' | 'yaml';
	plugins?: KegPluginData[];
	indexes?: IndexEntryData[];
};

const defaultKegConfigData = (updated?: Date): KegConfigData => ({
	$schema: defaultSchema,
	updated: updated ?? new Date(),
	kegv: '2023-01',
	state: 'living',
	title: 'An keg',
	url: 'git@github.com:YOU/keg.git',
	creator: 'git@github.com:YOU/YOU.git',
	plugins: [
		{ name: 'date', enable: true },
		{ name: 'tags', enable: true },
	],
	indexes: [
		{
			file: 'dex/nodes.tsv',
			summary: 'all nodes by id',
		},
		{
			plugin: 'date',
			file: 'dex/changes.md',
			summary: 'latest changes',
		},
		{
			plugin: 'tags',
			file: 'dex/tags.md',
			summary: 'all tags',
		},
	],
});

/**
 * Keg config service for managing configuration for a keg
 */
export class KegConfig {
	/**
	 * Load a keg file for the given path
	 */
	static fromStorage = async (
		storage: TStorage,
	): Future.Future<Optional.Optional<KegConfig>> => {
		return pipe(
			await storage.read('keg'),
			Optional.map((a) => KegConfig.fromYAML(a)),
		);
	};

	static fromYAML = (yaml: string): KegConfig => {
		const data = YAML.parse(yaml) as KegConfigData;
		return new KegConfig(data);
	};

	static fromJSON = (json: string): KegConfig => {
		const data = JSON.parse(json);
		return new KegConfig(data);
	};

	static default = (): KegConfig => {
		return new KegConfig({});
	};

	public data: KegConfigData;

	public constructor(
		/**
		 * Raw data for KegConfigData
		 */
		data: Partial<KegConfigData>,
	) {
		this.data = defaultKegConfigData();
		this.mergeData(data);
	}

	clone() {
		return new KegConfig(deepCopy(this.data));
	}

	mergeData(data: Partial<KegConfigData>) {
		const plugins = pipe(
			Array.dedupeWith(
				[...(this.data.plugins ?? []), ...(data.plugins ?? [])],
				(a, b) => a.name === b.name,
			),
		);
		const indexes = pipe(
			Array.dedupeWith(
				[...(this.data.indexes ?? []), ...(data.indexes ?? [])],
				(a, b) => a.file === b.file,
			),
		);
		this.data = { ...this.data, ...data, plugins, indexes };
	}

	*indexIter() {
		const entries: IndexEntryData[] = [];
		for (const entry of this.data.indexes ?? []) {
			entries.push(entry);
			yield entry satisfies IndexEntryData;
		}
		return entries;
	}

	get format(): KegConfigData['format'] {
		if (Optional.isNone(this.data.format)) {
			return 'yaml';
		}
		if (['yaml', 'json'].includes(this.data.format)) {
			return this.data.format;
		}
		return 'yaml';
	}

	set format(format: 'yaml' | 'json') {
		this.data.format = format;
	}

	/**
	 * Looks up plugin configuration details for a plugin
	 */
	lookupPluginData(plugin: string) {
		const isEnabled = pipe(
			this.data.plugins ?? [],
			Array.findFirst((a) => a.name === plugin),
			Option.match({ onNone: () => false, onSome: (a) => a.enable }),
		);
		const indexList = pipe(
			this.data.indexes ?? [],
			Array.filter((a) => a.plugin === plugin),
			Array.dedupeWith(
				(a, b) => a.plugin === b.plugin && a.file === b.file,
			),
		);

		return {
			isEnabled,
			indexList,
		};
	}

	async toStorage(
		storage: TStorage,
		options?: { updateTimeStamp?: boolean },
	): Future.Future<boolean> {
		if (options?.updateTimeStamp) {
			this.mergeData({ updated: new Date() });
		}
		return await storage.write('keg', stringify(this));
	}

	getAuthor(): Optional.Optional<string> {
		return this.data.creator ?? null;
	}

	getLink(nodeId: NodeId): Optional.Optional<string> {
		const linkfmt = this.data.linkfmt;
		return linkfmt ? linkfmt.replace('{{id}}', nodeId.stringify()) : null;
	}

	toYAML(): string {
		const schemaLine = `# yaml-language-server: $schema=${defaultSchema}`;
		const content = YAML.stringify(this.data);
		return [schemaLine, content].join('\n');
	}

	toJSON(pretty?: boolean): string {
		if (pretty) {
			return JSON.stringify(this.data, undefined, 4);
		}
		return JSON.stringify(this.data);
	}

	stringify(): string {
		return this.toYAML();
	}
}
