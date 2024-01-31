// import * as Mdast from 'mdast';
// import * as YAML from 'yaml';
// import { MarkdownAST as AST } from './markdown.js';
// import { KegNode, NodeId } from './node.js';
// import { Keg } from './keg.js';
// import { KegNodeRef } from './nodeRef.js';
//
// export type KegIndex = {
// 	init?(): Promise<void>;
//
// 	/**
// 	 * Load index contents
// 	 **/
// 	update?(): Promise<string>;
// 	addNode?(ref: KegNodeRef): Promise<void>;
// 	removeNode?(nodeId: NodeId): Promise<void>;
// 	depends?: string[];
// };
//
// export type KegPluginContext = {
// 	registerIndex(
// 		name: string,
// 		indexer: (keg: Keg) => Promise<KegIndex>,
// 	): Promise<void>;
//
// 	registerOnWrite(
// 		name: string,
// 		f: (nodeId: NodeId, node: KegNode) => string,
// 	): Promise<void>;
// };
//
// export type KegPlugin = (ctx: KegPluginContext) => void;
//

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

import { IndexPlugin, KnutPlugin } from './plugins/plugin.js';

//
// export const tagsIndexPlugin: Plugin = (ctx) => {
// 	ctx.registerKegIndex('tags.yaml', async () => {
// 		return {
// 			load: async () => {
// 				return keg.storage.read('dex/tags.yaml');
// 			},
// 			update: async (keg) => {
// 				const tagMap = new Map<string, string[]>();
// 				for await (const [nodeId, node] of keg.getNodeList()) {
// 					const tags = node.getTags();
// 					for (const tag of tags) {
// 						const tagSet = tagMap.get(tag) ?? [];
// 						tagSet.push(nodeId.stringify());
// 						tagMap.set(tag, tagSet);
// 					}
// 				}
// 				const content = YAML.stringify(tagMap);
// 				keg.storage.write('tags.yaml', content);
// 			},
// 		};
// 	});
// };
//
// export const dailyIndexPlugin: Plugin = (ctx) => {
// 	ctx.registerKegIndex('daily', async () => {
// 		const index: KegIndex = {
// 			init: async (options) => {},
// 			addNode: (node) => {},
// 		};
// 		return {
// 			update: async () => {
// 				for await (const [, node] of keg.getNodeList()) {
// 					const date = node.meta.get('date');
// 				}
// 			},
// 		};
// 	});
// 	ctx.on('postCreateNode', ({ nodeId, node, kegalias }) => {
// 		const tags = node.getTags();
// 		const rawDate = node.meta.get('date');
// 		if (typeof rawDate === 'string') {
// 		}
// 		if (tags.includes('daily')) {
// 		}
// 	});
// };
