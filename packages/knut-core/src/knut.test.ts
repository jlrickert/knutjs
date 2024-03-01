import { test, describe, expect } from 'vitest';
import { NodeId } from './node.js';
import { NodeContent } from './nodeContent.js';
import { TestContext } from './internal/testUtils.js';
import { Knut } from './knut.js';
import { collectAsync } from './utils.js';

describe('common programming patterns', async () => {
	test('should be able to load keg file details from sample keg', async () => {
		const context = await TestContext.nodeContext();
		await context.popluateFixture();
		const env = context.getEnv();
		const knut = await Knut.fromEnvironment(env);
		const keg = knut.getKeg('sample1');
		expect(keg!.kegFile?.getAuthor()).toEqual('git@github.com:YOU/YOU.git');
	});

	test('should be able to list all nodes', async () => {
		const context = await TestContext.nodeContext();
		await context.popluateFixture();
		const knut = await context.getKnut();
		const nodes = await collectAsync(knut.getNodeList());
		expect(nodes).toHaveLength(39);
	});

	test('should be able to read a node', async () => {
		const context = await TestContext.nodeContext();
		await context.popluateFixture();
		const knut = await context.getKnut();

		const keg = knut.getKeg('sample1');
		const nodeId = new NodeId(0);
		const node = await keg!.getNode(nodeId);
		expect(node?.title).toEqual('Sorry, planned but not yet available');
		const nodeContent = await keg?.storage.read(
			NodeContent.filePath(nodeId),
		);
		expect(node!.content).toEqual(nodeContent);
	});
	test('should be able to search through nodes', async () => {
		const context = await TestContext.nodeContext();
		await context.popluateFixture();
		const knut = await context.getKnut();
		const results = await knut.search({
			limit: 5,
			filter: { $text: { $search: 'lorem ipsum' } },
		});
		const topResult = results[0];
		expect(results.length).toBeLessThanOrEqual(5);
		expect(topResult.kegalias).toEqual('sample1');
		expect(topResult.nodeId).toEqual('7');
	});
});
