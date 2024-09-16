import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import * as Mdast from 'mdast';
import { MarkdownError, Optional, pipe, Result } from './index.js';

const parserExtensions = [gfm()];
const mdastExtensions = [gfmFromMarkdown()];
const compilerExtensions = [gfmToMarkdown()];

const myToMarkdown = (root: Mdast.Nodes) => {
	return toMarkdown(root, {
		rule: '-',
		bullet: '-',
		strong: '_',
		bulletOther: '+',
		extensions: compilerExtensions,
	});
};

const myFromMarkdown = (markdown: string) => {
	return Result.tryCatch(
		() => {
			return fromMarkdown(markdown, 'utf-8', {
				extensions: parserExtensions,
				mdastExtensions: mdastExtensions,
			});
		},
		(error) => {
			return MarkdownError.makeParseError({
				error,
				message: 'Invalid markdown',
			});
		},
	);
};

const isTitleToken = (token: Mdast.RootContent): token is Mdast.Heading => {
	return token.type === 'heading' && token.depth === 1;
};

const isParagraphToken = (
	token: Mdast.RootContent,
): token is Mdast.Paragraph => {
	return token.type === 'paragraph';
};

export class Markdown {
	static parse(markdown: string) {
		const root = myFromMarkdown(markdown);
		return Result.map(root, (root) => new Markdown(root));
	}

	private constructor(private root: Mdast.Root) {}

	getTitle(): Optional.Optional<string> {
		for (const child of this.root.children) {
			if (isTitleToken(child)) {
				const markdown = myToMarkdown({
					type: 'root',
					children: [child],
				});
				const title = markdown.slice(2, -1);
				return Optional.some(title);
			}
		}
		return Optional.none;
	}

	/**
	 * Mutates the title.  The title is the h1 on the first line
	 */
	setTitle(title: string) {
		for (let i = 0; i < this.root.children.length; i++) {
			const token = this.root.children[i];
			if (isTitleToken(token)) {
				token.children = [{ type: 'text', value: title }];
				return;
			}
		}
		const titleNode: Mdast.RootContent = {
			type: 'heading',
			depth: 1,
			children: [{ type: 'text', value: title }],
		};
		this.root.children = [titleNode, ...this.root.children];
	}

	/**
	 * gets the first paragraph. typically on line 3
	 */
	getSummary(): Optional.Optional<string> {
		for (let i = 0; i < this.root.children.length; i++) {
			const child = this.root.children[i];
			if (isParagraphToken(child)) {
				return Optional.some(myToMarkdown(child));
			}
			// TODO(jared): The content is probably at position 1
			if (i <= 3) {
				return Optional.none;
			}
		}
		return Optional.none;
	}

	/**
	 * Mutates the first paragraph
	 */
	setSummary(
		summary: string | Mdast.PhrasingContent[],
	): Optional.Optional<MarkdownError.MarkdownError> {
		const content =
			typeof summary === 'string'
				? pipe(
						myFromMarkdown(summary),
						Result.map(
							(a) => a.children as Mdast.PhrasingContent[],
						),
				  )
				: Result.ok(summary);
		if (Result.isErr(content)) {
			return Optional.some(content.error);
		}
		for (const child of this.root.children) {
			if (isParagraphToken(child)) {
				child.children = content.value;
				return Optional.none;
			}
		}
		this.root.children = [
			this.root.children[0],
			{ type: 'paragraph', children: content.value },
			...this.root.children.slice(2, -1),
		];
		return Optional.none;
	}

	pushList(
		list: [],
		options?: { title?: string; titleType: 'heading' | 'string' },
	) {}

	stringify() {
		return myToMarkdown(this.root);
	}
}
