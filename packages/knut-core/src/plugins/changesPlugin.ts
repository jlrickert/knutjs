import * as Mdast from 'mdast';
import { MarkdownAST as AST } from '../markdown.js';
import { KegPluginContext } from '../internal/plugins/kegPlugin.js';
import { collect, stringify } from '../utils.js';
import { Keg } from '../keg.js';

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
		const md = AST.list(
			entryList.map((entry): Mdast.ListItem => {
				const date = AST.text(stringify(entry.updated));
				const space = AST.text(' ');
				const link = AST.nodeLink(entry);
				return AST.listItem([AST.paragraph([date, space, link])]);
			}),
			{ spread: false },
		);
		const content = AST.to(md)
			.split('\n')
			// This sort seems to define order closest to how rwxrob's keg
			// program defines it
			.sort((a, b) => {
				const subA = a.replace(/\[.*\]/, '');
				const subB = b.replace(/\[.*\]/, '');
				return subA < subB ? 1 : -1;
			})
			.join('\n');
		return content;
	}

	getConfig(keg: Keg) {
		const options = collect(keg.kegFile.getIndexes());
		const changesOptions = options.filter((a) => a.name === 'changes');
		return changesOptions;
	}
}
