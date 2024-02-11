import invariant from 'tiny-invariant';
import { pipe } from 'fp-ts/lib/function.js';
import { KegPlugin, KegPluginContext } from '../internal/plugins/kegPlugin.js';
import { collect, stringify } from '../utils.js';
import { Keg } from '../keg.js';
import { IndexEntryData } from '../kegFile.js';
import { NodeId } from '../node.js';
import { DexEntry } from '../dex.js';

export class NodesPlugin implements KegPlugin {
	name = 'nodes';

	async activate(ctx: KegPluginContext) {
		ctx.registerIndex({
			name: 'nodes',
			update: async () => this.update(ctx.keg),
		});

		await this.init(ctx.keg);
	}

	async deactivate(ctx: KegPluginContext) {}

	/**
	 * filePaths lists all files in the keg file that is assocated with this
	 * keg and plugin
	 **/
	async filePaths(keg: Keg): Promise<string[]> {
		const options = await this.getConfig(keg);
		const filenames = options.map((a) => a.file);
		return filenames;
	}

	/**
	 *
	 **/
	async buildIndex(keg: Keg, option?: IndexEntryData) {
		const lines: string[] = [];
		for await (const nodeId of keg.storage.listNodes()) {
			const node = await keg.getNode(nodeId);
			invariant(
				node,
				'Expect to get node and stat from a nodeId reported by storage',
			);
			const line = [stringify(nodeId), node.updated, node.title].join(
				'\t',
			);
			lines.push(line);
		}

		const content = lines.join('\n');
		return content;
	}

	async buildIndexFromFilename(
		keg: Keg,
		filename: string,
	): Promise<string | null> {
		const options = await this.getConfig(keg);
		const option = options.find((a) => a.file === filename) ?? null;
		if (option === null) {
			return null;
		}
		const content = this.buildIndex(keg);
		return content;
	}

	async updateFile(keg: Keg, option: IndexEntryData) {
		const content = await this.buildIndex(keg, option);
		await keg.storage.write(option.file, content);
	}

	async update(keg: Keg) {
		for (const option of await this.getConfig(keg)) {
			await this.updateFile(keg, option);
		}
	}

	async getConfig(keg: Keg): Promise<IndexEntryData[]> {
		// TODO(jared): Add error handling
		return pipe(keg.kegFile.getIndexes(), collect, (indexes) => {
			return indexes.filter((a) => a.name === this.name);
		});
	}

	/**
	 * init loads the dex
	 **/
	async init(keg: Keg) {
		for (const { file } of await this.getConfig(keg)) {
			const { dex, storage } = keg;
			const content = await storage.read(file);
			const lines = content === null ? [] : content.split('\n');
			for (const line of lines) {
				// ingore empty last line if it exists
				if (line === '') {
					continue;
				}
				const [id, updated, title] = line.split('\t');
				const nodeId = NodeId.parsePath(id);
				if (nodeId) {
					const entry: DexEntry = { title, updated, nodeId };
					dex.addEntry(entry);
				}
			}
		}
	}
}
