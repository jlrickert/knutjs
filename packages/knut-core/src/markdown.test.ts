import { describe, expect, test } from 'vitest';
import { KegNode, NodeId } from './node';
import { MarkdownAST as AST } from './markdown';
import { stringify } from './utils';

describe('common markdown operations', () => {
	test('should be able to generate a node link', async () => {
		const node = await KegNode.fromContent({
			updated: '2023-23-03',
			content: '# Example title',
			created: stringify(new Date()),
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
				updated: '2023-23-03',
				content: '# Example title 1',
				created: stringify(new Date()),
			}),
			KegNode.fromContent({
				updated: '2023-20-03',
				content: '# Example title 2',
				created: stringify(new Date()),
			}),
			KegNode.fromContent({
				updated: '2023-21-03',
				content: '# Example title 3',
				created: stringify(new Date()),
			}),
		]);
		const ast = AST.list(
			nodeList.map((node, i) => {
				const date = AST.text(node.updated);
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
