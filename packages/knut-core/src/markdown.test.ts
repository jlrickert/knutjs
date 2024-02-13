import { describe, expect, test } from 'vitest';
import { KegNode, NodeId } from './node.js';
import { MarkdownAST as AST } from './markdown.js';
import { stringify } from './utils.js';

describe('common markdown operations', () => {
	test('should be able to generate a node link', async () => {
		const node = await KegNode.fromContent({
			updated: new Date('2023-23-03'),
			content: '# Example title',
			created: new Date(),
		});
		const ast = AST.nodeLink({
			nodeId: new NodeId(43),
			title: node.title,
			updated: node.updated,
		});
		const content = AST.to(ast);
		expect(content).toEqual('[Example title](../43)\n');
	});

	test('should be able to generate a list', async () => {
		const nodeList = await Promise.all([
			KegNode.fromContent({
				updated: new Date('2023-03-22'),
				content: '# Example title 1',
				created: new Date(),
			}),
			KegNode.fromContent({
				updated: new Date('2023-03-23'),
				content: '# Example title 2',
				created: new Date(),
			}),
			KegNode.fromContent({
				updated: new Date('2023-03-21'),
				content: '# Example title 3',
				created: new Date(),
			}),
		]);
		const ast = AST.list(
			nodeList.map((node, i) => {
				const date = AST.text(stringify(node.updated));
				const space = AST.text(' ');
				const link = AST.nodeLink({
					nodeId: new NodeId(i),
					updated: node.updated,
					title: node.title,
				});
				return AST.listItem([AST.paragraph([date, space, link])]);
			}),
			{ spread: false },
		);
		const content = AST.to(ast);
		expect(content).matchSnapshot('list of items');
	});
});
