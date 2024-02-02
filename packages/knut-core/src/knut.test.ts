import { test, describe, expect, beforeEach, afterEach } from 'vitest';
import { KegNode, NodeId } from './node.js';
import { NodeContent } from './nodeContent.js';
import { TestContext, createSampleKnutApp } from './internal/testUtils.js';

describe('common programming patterns', async () => {
	let ctx!: TestContext;

	beforeEach(async () => {
		ctx = await createSampleKnutApp();
	});

	afterEach(async () => {
		await ctx.reset();
	});

	test('should be able to load keg file details from sample keg', async () => {
		const keg = ctx.knut.getKeg('sample');
		expect(keg!.kegFile?.getAuthor()).toEqual('git@github.com:YOU/YOU.git');
	});

	test('should be able to list all nodes', async () => {
		const nodes: KegNode[] = [];
		for await (const [, , node] of ctx.knut.getNodeList()) {
			nodes.push(node);
		}
		expect(nodes).toHaveLength(13);
	});

	test('should be able to read a node', async () => {
		const keg = ctx.knut.getKeg('sample');
		const nodeId = new NodeId(0);
		const node = await keg!.getNode(nodeId);
		expect(node?.title).toEqual('Sorry, planned but not yet available');
		const nodeContent = await ctx.storage
			.child('samplekeg')
			.read(NodeContent.filePath(nodeId));
		expect(node!.content).toEqual(nodeContent);
	});

	test('should be able to search through nodes', async () => {
		const results = await ctx.knut.search({
			limit: 5,
			filter: { $text: { $search: 'lorem ipsum' } },
		});
		const topResult = results[0];
		expect(results.length).toBeLessThanOrEqual(5);
		expect(topResult.nodeId).toEqual('7');
	});
});
