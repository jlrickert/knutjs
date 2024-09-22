import { fromMarkdown as mdastFromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import * as Mdast from 'mdast';
import { Result } from '../Utils/index.js';
import { MarkdownError } from './index.js';
import { KnutErrorScopeMap } from './KnutError.js';

const parserExtensions = [gfm()];
const mdastExtensions = [gfmFromMarkdown()];
const compilerExtensions = [gfmToMarkdown()];

export type MarkdownAST = Mdast.Root;

export const fromAST = (root: Mdast.Nodes) => {
	return toMarkdown(root, {
		rule: '-',
		bullet: '-',
		strong: '_',
		bulletOther: '+',
		extensions: compilerExtensions,
	});
};

export const parseMarkdown = (
	markdown: string,
): Result.Result<MarkdownAST, KnutErrorScopeMap['MARKDOWN']> => {
	return Result.tryCatch(
		() => {
			return mdastFromMarkdown(markdown, 'utf-8', {
				extensions: parserExtensions,
				mdastExtensions: mdastExtensions,
			});
		},
		(error: any) => {
			return MarkdownError.makeParseError({
				error,
				message: 'Invalid markdown',
			});
		},
	);
};

export const isTitleToken = (
	token: Mdast.RootContent,
): token is Mdast.Heading => {
	return token.type === 'heading' && token.depth === 1;
};

export const isParagraphToken = (
	token: Mdast.RootContent,
): token is Mdast.Paragraph => {
	return token.type === 'paragraph';
};
