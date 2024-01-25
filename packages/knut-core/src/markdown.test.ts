import { describe, expect, test } from 'vitest';
import { KegNode } from './node';
import { MarkdownAST as AST } from './markdown';

describe('common markdown operations', () => {
	test('should be able to generate a node link', async () => {
		const node = await KegNode.fromContent({
			updated: '2023-23-03',
			content: '# Example title',
		});
		const ast = AST.nodeLink('43', node);
		const content = AST.to(ast);
		expect(content).toEqual('[Example title](../43)\n');
	});

	test('should be able to generate a list', async () => {
		const nodeList = await Promise.all([
			KegNode.fromContent({
				updated: '2023-23-03',
				content: '# Example title 1',
			}),
			KegNode.fromContent({
				updated: '2023-20-03',
				content: '# Example title 2',
			}),
			KegNode.fromContent({
				updated: '2023-21-03',
				content: '# Example title 3',
			}),
		]);
		const ast = AST.list(
			nodeList.map((node, i) => {
				const date = AST.text(node.updated);
				const space = AST.text(' ');
				const link = AST.nodeLink(String(i), node);
				return AST.listItem([AST.paragraph([date, space, link])]);
			}),
			{ spread: false },
		);
		const content = AST.to(ast);
		expect(content).matchSnapshot('list of items');
	});
});
