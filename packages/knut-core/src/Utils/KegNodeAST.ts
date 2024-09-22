import * as Mdast from 'mdast';
import { Optional, pipe, Result } from './index.js';
import { KnutError, Markdown } from '../Data/index.js';
export type KegNodeASTOutput = 'markdown';

export class KegNodeAST {
	static parseMarkdown(markdown: string) {
		const root = Markdown.parseMarkdown(markdown);
		return Result.map(root, (root) => new KegNodeAST(root));
	}

	static make() {
		return new KegNodeAST({ type: 'root', children: [] });
	}

	static create(args: { title: string; summary: string }) {
		const ast = KegNodeAST.make();
		ast.setTitle(args.title);
		ast.setSummary(args.summary);
		return ast;
	}

	private constructor(private root: Mdast.Root) {}

	getTitle(): Optional.Optional<string> {
		for (const child of this.root.children) {
			if (Markdown.isTitleToken(child)) {
				const markdown = Markdown.fromAST({
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
			if (Markdown.isTitleToken(token)) {
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
			if (Markdown.isParagraphToken(child)) {
				return Optional.some(Markdown.fromAST(child));
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
	): Optional.Optional<KnutError.KnutErrorScopeMap['MARKDOWN']> {
		const content =
			typeof summary === 'string'
				? pipe(
						Markdown.parseMarkdown(summary),
						Result.map(
							(a) => a.children as Mdast.PhrasingContent[],
						),
				  )
				: Result.ok(summary);
		if (Result.isErr(content)) {
			return Optional.some(content.error);
		}
		for (const child of this.root.children) {
			if (Markdown.isParagraphToken(child)) {
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

	pushList(list: Mdast.ListItem[], options?: { title?: string }) {
		const title = options?.title;
		if (Optional.isSome(title)) {
			this.root.children.push({
				type: 'heading',
				depth: 2,
				children: [{ type: 'text', value: title }],
			});
		}
		this.root.children.push({
			type: 'list',
			spread: false,
			children: list,
		});
	}

	stringify() {
		return Markdown.fromAST(this.root);
	}
}
