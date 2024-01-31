import * as Mdast from 'mdast';
import { MarkdownAST as AST } from '../markdown.js';
import { definePlugin } from './plugin.js';
import { IndexPluginCreator } from './indexPlugin.js';

const changesIndex: IndexPluginCreator = async ({ keg }) => {
	return {
		name: 'changes',
		update: async () => {
			const options = keg.kegFile.getIndex('changes');
			if (!options) {
				return;
			}
			const filename = options.file ?? 'dex/changes.md';
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
		name: 'changes',
		searchList: [],
		indexList: [changesIndex],
	};
});
