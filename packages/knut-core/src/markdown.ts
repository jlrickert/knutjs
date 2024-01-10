import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import * as Mdast from 'mdast';

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

	static to(root: Mdast.Root): string {
		return toMarkdown(root, { extensions: [gfmToMarkdown()] });
	}
}
