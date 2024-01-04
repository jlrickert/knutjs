import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import * as Mdast from 'mdast';
import { DexEntry } from './dex';

export type MarkdownOptions = {};
export class Markdown {
	static parse(markdown: string): Markdown {
		const tree = Markdown.fromMarkdown(markdown);
		return new Markdown(tree);
	}

	static createIndex({
		title,
		summary,
		entries,
	}: {
		title?: string;
		summary?: string;
		entries: DexEntry[];
	}): Markdown {
		let mdNodes: Mdast.RootContent[] = [];
		if (title) {
			mdNodes.push({
				type: 'heading',
				depth: 1,
				children: [{ type: 'text', value: title }],
			});
		}

		if (summary) {
			const summaryNodes = Markdown.fromMarkdown(summary).children;
			for (const node of summaryNodes) {
				mdNodes.push(node);
			}
		}

		const listNode: Mdast.List = { type: 'list', children: [] };
		mdNodes.push(listNode);
		for (const entry of entries) {
			listNode.children.push({
				type: 'listItem',
				children: [
					{
						type: 'paragraph',
						children: [
							{ type: 'text', value: entry.updated },
							{
								type: 'link',
								url: `../${entry.title}`,
								children: [
									{ type: 'text', value: entry.title },
								],
							},
						],
					},
				],
			});
		}

		const tree: Mdast.Root = {
			type: 'root',
			children: mdNodes,
		};
		return new Markdown(tree);
	}

	private static isTitleToken(
		token: Mdast.RootContent,
	): token is Mdast.Heading {
		return token.type === 'heading' && token.depth === 1;
	}

	private static fromMarkdown(markdown: string): Mdast.Root {
		return fromMarkdown(markdown, 'utf-8', {
			extensions: [gfm()],
			mdastExtensions: [gfmFromMarkdown()],
		});
	}

	private static toMarkdown(root: Mdast.Root): string {
		return toMarkdown(root, { extensions: [gfmToMarkdown()] });
	}

	private constructor(private root: Mdast.Root) {}

	getTitle(): string | null {
		for (const child of this.root.children) {
			if (Markdown.isTitleToken(child)) {
				const markdown = Markdown.toMarkdown({
					type: 'root',
					children: [child],
				});
				return markdown.slice(2, -1);
			}
		}
		return null;
	}
	setTitle(title: string) {
		for (let i = 0; i < this.root.children.length; i++) {
			const token = this.root.children[i];
			if (Markdown.isTitleToken(token)) {
				token.children = [{ type: 'text', value: title }];
				return;
			}
		}
	}

	addIndex(title: string, content: string[]) {}

	/**
	 * export
	 */
	stringify(): string {
		return toMarkdown(this.root, { extensions: [gfmToMarkdown()] });
	}
}
