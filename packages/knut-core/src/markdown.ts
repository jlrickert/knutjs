import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import * as Mdast from 'mdast';
import { DexEntry } from './dex.js';

export class MarkdownAST {
	static isTitleToken(token: Mdast.RootContent): token is Mdast.Heading {
		return token.type === 'heading' && token.depth === 1;
	}

	static from(markdown: string): Mdast.Root {
		return fromMarkdown(markdown, 'utf-8', {
			extensions: [gfm()],
			mdastExtensions: [gfmFromMarkdown()],
		});
	}

	static to(root: Mdast.Nodes): string {
		return toMarkdown(root, { extensions: [gfmToMarkdown()] });
	}

	static text(value: string): Mdast.Text {
		return { type: 'text', value };
	}

	static list(
		children: Mdast.ListItem[],
		options?: { ordered?: boolean; spread?: boolean },
	): Mdast.List {
		return {
			type: 'list',
			children,
			ordered: options?.ordered,
			spread: options?.spread,
		};
	}

	static listItem(children: Mdast.BlockContent[]): Mdast.ListItem {
		return { type: 'listItem', children };
	}

	static paragraph(children: Mdast.PhrasingContent[]): Mdast.Paragraph {
		return { type: 'paragraph', children };
	}

	static nodeLink(node: DexEntry): Mdast.Link {
		const id = node.nodeId;
		return {
			type: 'link',
			url: `../${id}`,
			children: [{ type: 'text', value: node.title }],
		};
	}
}

export class MarkdownDocument {
	md = MarkdownAST.from('');

	addList(items: Mdast.ListItem[]): void {
		if (this.md.children)
			this.md.children.push({
				type: 'list',
				children: items,
			});
	}

	stringify(): string {
		return MarkdownAST.to(this.md);
	}
}
