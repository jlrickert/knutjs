import * as Mdast from 'mdast';
import * as YAML from 'yaml';
import { MarkdownAST as AST } from './markdown.js';
import { KegNode, NodeId } from './node.js';
import { KegStorage } from './kegStorage/kegStorage.js';
import { Keg } from './keg.js';

export type KegIndex = {
	/**
	 * Load index contents
	 **/
	merge?(storage: KegStorage): Promise<void>;
	update?(): Promise<void>;
	addNode?(nodeId: NodeId, node: KegNode): Promise<void>;
	removeNode?(nodeId: NodeId): Promise<void>;
	depends?: string[];
};

export type KegPluginContext = {
	registerIndex(
		name: string,
		indexer: (keg: Keg) => Promise<KegIndex>,
	): Promise<void>;

	registerOnWrite(
		name: string,
		f: (nodeId: NodeId, node: KegNode) => string,
	): Promise<void>;
};

export type KegPlugin = (ctx: KegPluginContext) => void;

export const nodesIndexPlugin: KegPlugin = (ctx) => {
	ctx.registerIndex('nodes.tsv', async (keg) => {
		const merge: KegIndex['merge'] = async (storage) => {
			const content = await keg.storage.read('dex/nodes.tsv');
			if (content) {
				await storage.write('dex/nodes.tsv', content);
			}
		};
		const update: KegIndex['update'] = async () => {
			keg.dex.clear();
			const idList = await keg.storage.listNodes();
			for (const nodeId of idList) {
				const node = await keg.getNode(nodeId);
				if (node) {
					keg.dex.addNode(nodeId, node);
				}
			}

			const lines: string[] = [];
			for (const entry of keg.dex.entries) {
				const line = [entry.nodeId, entry.updated, entry.title].join(
					'\t',
				);
				lines.push(line);
			}
			const content = lines.join('\n');
			await keg.storage.write('dex/nodes.tsv', content);
		};

		const contents = await keg.storage.read('dex/nodes.tsv');
		if (!contents) {
			await update();
		}

		return { load: merge, update };
	});
};

export const changesIndexPlugin: KegPlugin = (ctx) => {
	ctx.registerIndex('changes.md', async (keg) => {
		return {
			async merge(storage) {
				const content = await keg.storage.read('dex/changes.md');
				if (content) {
					await storage.write('dex/changes.md', content);
				}
			},
			async update() {
				const entryList = [...keg.dex.entries];
				entryList.sort((a, b) => {
					return (
						new Date(b.updated).getUTCMilliseconds() -
						new Date(a.updated).getUTCMilliseconds()
					);
				});
				const md = AST.list(
					keg.dex.entries.map((entry): Mdast.ListItem => {
						const date = AST.text(entry.updated);
						const space = AST.text(' ');
						const link = AST.nodeLink(entry.nodeId, entry);
						return AST.listItem([
							AST.paragraph([date, space, link]),
						]);
					}),
					{ spread: false },
				);
				const content = AST.to(md);
				await keg.storage.write('changes.md', content);
			},
		};
	});
};

export const tagsIndexPlugin: KegPlugin = (ctx) => {
	ctx.registerIndex('tags.yaml', async (keg) => {
		return {
			load: async () => {
				return keg.storage.read('dex/tags.yaml');
			},
			update: async () => {
				const tagMap = new Map<string, string[]>();
				for await (const [nodeId, node] of keg.getNodeList()) {
					const tags = node.getTags();
					for (const tag of tags) {
						const tagSet = tagMap.get(tag) ?? [];
						tagSet.push(nodeId.stringify());
						tagMap.set(tag, tagSet);
					}
				}
				const content = YAML.stringify(tagMap);
				keg.storage.write('tags.yaml', content);
			},
		};
	});
};

export const dailyIndexPlugin: KegPlugin = (ctx) => {
	ctx.registerIndex('daily.md', async (keg) => {
		return {
			async merge(storage) {
				const content = await keg.storage.read('dex/daily.md');
				if (content) {
					await storage.write('dex/daily.md', content);
				}
			},

			async update() {
				for await (const [, node] of keg.getNodeList()) {
					const date = node.meta.get('date');
				}
			},
		};
	});
};
