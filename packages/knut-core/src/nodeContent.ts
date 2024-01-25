import { Root, RootContent } from 'mdast';
import { MarkdownAST } from './markdown.js';
import { NodeId } from './node.js';

export class NodeContent {
	static filePath(nodeId: NodeId) {
		return `${nodeId.stringify()}/README.md`;
	}

	filePath(nodeId: NodeId) {
		return `${nodeId.stringify()}/README.md`;
	}

	static async fromMarkdown(markdown: string): Promise<NodeContent> {
		const root = MarkdownAST.from(markdown);
		return new NodeContent(root);
	}

	private constructor(private root: Root) {}

	get title(): string {
		for (const child of this.root.children) {
			if (MarkdownAST.isTitleToken(child)) {
				const markdown = MarkdownAST.to({
					type: 'root',
					children: [child],
				});
				const title = markdown.slice(2, -1);
				return title;
			}
		}
		return '';
	}

	set title(title: string) {
		for (let i = 0; i < this.root.children.length; i++) {
			const token = this.root.children[i];
			if (MarkdownAST.isTitleToken(token)) {
				token.children = [{ type: 'text', value: title }];
				return;
			}
		}
		const titleNode: RootContent = {
			type: 'heading',
			depth: 1,
			children: [{ type: 'text', value: title }],
		} satisfies RootContent;
		this.root.children = [titleNode, ...this.root.children];
	}

	stringify() {
		return MarkdownAST.to(this.root);
	}
}
