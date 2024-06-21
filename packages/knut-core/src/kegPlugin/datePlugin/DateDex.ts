import invariant from 'tiny-invariant';
import { Array, Data, Equal, Option, String, pipe } from 'effect';
import { Dex } from '../../Dex.js';
import { KegNode, NodeId } from '../../KegNode.js';
import { Optional } from '../../internal/index.js';
import { TStorage } from '../../storage/storage.js';
import { Json, isJsonObject, stringify } from '../../utils.js';
import { IndexEntryData } from '../../KegConfig.js';

const DEFAULT_PLUGIN_NAME = 'date';

export type EntryShape = {
	nodeId: NodeId;
	updated: Date;
	title: string;
};

class Entry extends Data.Class<EntryShape> {
	stringify() {
		return `${stringify(this.nodeId)}\t${stringify(this.updated)}\t${
			this.title
		}`;
	}
}

export class DateDexConfig extends Data.Class<{
	plugin: string;
	file: string;
	tags: readonly string[];
	summary: string | null;
}> {
	static parse(config: IndexEntryData): Optional.TOptional<DateDexConfig> {
		if (Optional.isNone(config.plugin)) {
			return Optional.none;
		}
		const plugin = config.plugin;
		const file = config.file;
		const summary = config.summary ?? null;
		const args = config.args as Json & {
			tag?: string | Json;
			tags?: string[] | Json;
		};
		if (Optional.isNone(config.args) || !isJsonObject(args)) {
			return new DateDexConfig({ plugin, file, summary, tags: [] });
		}
		if (
			Array.isArray(args.tags) &&
			Array.every(args.tags, String.isString)
		) {
			return new DateDexConfig({
				plugin,
				file,
				summary,
				tags: args.tags,
			});
		}
		if ('tag' in args && typeof args.tag === 'string') {
			return new DateDexConfig({
				plugin,
				file,
				summary,
				tags: [args.tag],
			});
		}
		return new DateDexConfig({ plugin, file, summary, tags: [] });
	}

	shouldInclude(node: KegNode) {
		const tags = node.meta.getTags();
		return Equal.equals(Array.intersection(this.tags, tags), tags);
	}

	toRawConfig(): IndexEntryData {
		if (Optional.isSome(this.summary)) {
			return {
				plugin: this.plugin,
				file: this.file,
				summary: this.summary,
				args: { tags: [...this.tags] },
			};
		}
		return {
			plugin: this.plugin,
			file: this.file,
			args: { tags: [...this.tags] },
		};
	}
}

export class DateDex {
	public entryList: Entry[] = [];

	static parse(rawConfig: IndexEntryData): DateDex {
		const config = DateDexConfig.parse({
			...rawConfig,
			// ensure that plugin is available
			plugin: rawConfig.plugin ?? DEFAULT_PLUGIN_NAME,
		});
		invariant(
			Optional.isSome(config),
			'Expected parser to return true when a plugin name is available',
		);
		return new DateDex(config);
	}

	constructor(public readonly config: DateDexConfig) {}

	/**
	 * Loads entries from storage. Does not clear before reading
	 * @param storage
	 */
	async fromStorage(storage: TStorage) {
		this.clear();
		const content = await storage.read(this.config.file);
		if (Optional.isNone(content)) {
			return false;
		}
		const entries = pipe(
			content.split('\n'),
			Array.filterMap((a) => {
				const line = a.split('\t');
				return line.length === 3 ? Option.some(line) : Option.none();
			}),
			Array.filterMap(([id, updated, title]) => {
				return pipe(
					NodeId.parsePath(id),
					Option.fromNullable,
					Option.map(
						(nodeId) =>
							new Entry({
								nodeId,
								updated: new Date(updated),
								title,
							}),
					),
				);
			}),
		);
		this.addBulkEntries(entries);
		return true;
	}

	async toStorage(storage: TStorage) {
		return await storage.write(this.config.file, stringify(this));
	}

	rebuildFromDex(dex: Dex) {
		this.clear();
		this.addBulkEntries(dex.entries);
	}

	addEntry(entry: Entry) {
		this.pushEntry(entry);
		this.sortEntries();
	}

	addBulkEntries(list: readonly Entry[]) {
		for (const entry of list) {
			this.pushEntry(entry);
		}

		this.sortEntries();
	}

	private pushEntry(entry: Entry) {
		const index = this.entryList.findIndex((a) =>
			a.nodeId.eq(entry.nodeId),
		);
		if (index < 0) {
			this.entryList.push(entry);
			return;
		}

		this.entryList[index] = entry;
	}

	private sortEntries() {
		this.entryList.sort(
			(a, b) => a.updated.getDate() - b.updated.getDate(),
		);
	}

	/**
	 * Update entry updates primarily is for updating the time stamp of an entry.
	 * The behavior is the same as addEntry
	 */
	updateEntry(entry: Entry) {
		this.addEntry(entry);
	}

	removeNode(nodeId: NodeId) {
		const index = this.entryList.findIndex((a) => a.nodeId.eq(nodeId));
		if (index < 0) {
			return;
		}

		delete this.entryList[index];
	}

	clear() {
		this.entryList = [];
	}

	stringify() {
		return this.entryList.map((entry) => stringify(entry)).join('\n');
	}
}
