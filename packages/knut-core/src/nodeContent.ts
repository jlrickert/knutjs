import { PhrasingContent, Root, RootContent } from 'mdast';
import { MarkdownAST } from './markdown.js';
import { NodeId } from './node.js';
import { stringify } from './utils.js';
import { DexEntry } from './dex.js';

export class NodeContent {
	static filePath(nodeId: NodeId) {
		return `${stringify(nodeId)}/README.md`;
	}

	filePath(nodeId: NodeId) {
		return `${stringify(nodeId)}/README.md`;
	}

	static async fromMarkdown(markdown: string): Promise<NodeContent> {
		const root = MarkdownAST.from(markdown);
		return new NodeContent(root);
	}

	private constructor(private root: Root) {}

	get title(): string | null {
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
		return null;
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

	mapLinks(map: Map<string, DexEntry>) {
		const r = (contentList: RootContent[] | PhrasingContent[]) => {
			for (let i = 0; i < contentList.length; i++) {
				const token = contentList[i];
				if (token.type === 'link') {
					const nodeId = NodeId.parsePath(token.url);
					if (nodeId) {
						const entry = map.get(stringify(nodeId)) ?? null;
						if (entry) {
							contentList[i] = MarkdownAST.nodeLink(entry);
						}
					}
				}
				if ('children' in token) {
					r(token.children);
				}
			}
		};
		r(this.root.children);
	}

	stringify() {
		return MarkdownAST.to(this.root);
	}
}
