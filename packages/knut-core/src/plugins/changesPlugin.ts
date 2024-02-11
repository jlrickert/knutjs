import * as Mdast from 'mdast';
import { pipe } from 'fp-ts/lib/function.js';
import { MarkdownAST as AST } from '../markdown.js';
import { KegPluginContext } from '../internal/plugins/kegPlugin.js';
import { collect, stringify } from '../utils.js';
import { Keg } from '../keg.js';
import { IndexEntryData } from '../kegFile.js';

export class ChangesPlugin {
	readonly name = 'changes';
	async activate(ctx: KegPluginContext) {
		ctx.registerIndex({
			name: 'changes',
			depends: ['nodes'],
			update: () => this.update(ctx.keg),
		});
	}

	async deactivate(ctx: KegPluginContext) {}

	async update(keg: Keg) {
		const content = await this.buildIndex(keg);
		for (const { file } of this.getConfig(keg)) {
			await keg.storage.write(file, content);
		}
	}

	async buildIndex(keg: Keg) {
		const entryList = [...keg.dex.entries];
		entryList.sort((a, b) => {
			if (a.updated === b.updated) {
				return stringify(a.nodeId) < stringify(b.nodeId) ? 1 : -1;
			}
			return a.updated < b.updated ? 1 : -1;
		});
		const md = AST.list(
			entryList.map((entry): Mdast.ListItem => {
				const date = AST.text(entry.updated);
				const space = AST.text(' ');
				const link = AST.nodeLink(entry);
				return AST.listItem([AST.paragraph([date, space, link])]);
			}),
			{ spread: false },
		);
		const content = AST.to(md);
		return content;
	}

	getConfig(keg: Keg) {
		const options = collect(keg.kegFile.getIndexes());
		const changesOptions = options.filter((a) => a.name === 'changes');
		return changesOptions;
	}
}
