import * as Mdast from 'mdast';
import { MarkdownAST as AST } from '../markdown.js';
import { stringify } from '../utils.js';
import { definePlugin } from './plugin.js';
import { IndexPluginCreator } from './indexPlugin.js';

export const dailyIndex: IndexPluginCreator = async ({ keg }) => {
	return {
		name: 'daily',
		update: async () => {
			const options = keg.kegFile.getIndex('daily');
			if (!options) {
				return;
			}

			const filename = options?.name ?? 'dex/daily.md';
			const itemList: { date: string; title: string; id: string }[] = [];
			for await (const [nodeId, node] of keg.getNodeList()) {
				const date = node.meta.getDate();
				const tags = node.getTags();
				if (!date || !tags.includes('daily')) {
					continue;
				}
				itemList.push({
					id: stringify(nodeId),
					date,
					title: node.title,
				});
			}
			itemList.sort((a, b) => {
				return (
					new Date(b.date).getUTCMilliseconds() -
					new Date(a.date).getUTCMilliseconds()
				);
			});
			const md = AST.list(
				keg.dex.entries.map((entry): Mdast.ListItem => {
					const date = AST.text(entry.updated);
					const space = AST.text(' ');
					const link = AST.nodeLink(entry);
					return AST.listItem([AST.paragraph([date, space, link])]);
				}),
				{ spread: false },
			);

			const content = AST.to(md);
			await keg.storage.write(filename, content);
		},
	};
};

export default definePlugin(async () => {
	return {
		name: 'daily',
		searchList: [],
		indexList: [dailyIndex],
	};
});
