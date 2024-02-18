import { test, describe, expect } from 'vitest';
import { pipe } from 'fp-ts/lib/function.js';
import invariant from 'tiny-invariant';
import { KegNode, NodeId } from './node.js';
import { NodeContent } from './nodeContent.js';
import { testUtilsM } from './internal/testUtils.js';
import { collectAsync } from './utils.js';

describe('common programming patterns', async () => {
	test('should be able to load keg file details from sample keg', async () => {
		const knut = await testUtilsM.createTestKnut();
		const keg = knut.getKeg('sample');
		expect(keg!.kegFile?.getAuthor()).toEqual('git@github.com:YOU/YOU.git');
	});

	test('should be able to list all nodes', async () => {
		const knut = await testUtilsM.createTestKnut();
		const nodes: KegNode[] = [];
		for await (const [, , node] of knut.getNodeList()) {
			nodes.push(node);
		}
		expect(nodes).toHaveLength(13);
	});

	test('should be able to create a node', async () => {
		const knut = await testUtilsM.createTestKnut();
		const keg = knut.getKeg('sample')!;
		const prevCount = pipe(
			await collectAsync(keg.storage.listNodes()),
			(a) => a.length,
		);
		const nodeId = await keg.createNode();
		const count = pipe(
			await collectAsync(keg.storage.listNodes()),
			(a) => a.length,
		);
		expect(count - prevCount).toEqual(1);
		const node = await keg.getNode(nodeId);
		const now = new Date();
		expect(node).toBeTruthy();
		invariant(
			node,
			'Expect test case above to fail if node cannot be found',
		);

		const updatedDelta =
			new Date(node.updated).getUTCDate() - now.getUTCDate();
		const createdDelta =
			new Date(node.created).getUTCDate() - now.getUTCDate();
		expect(updatedDelta).toBeLessThanOrEqual(5);
		expect(createdDelta).toBeLessThanOrEqual(5);
		expect(node.title).toEqual('');
	});

	test('should be able to read a node', async () => {
		const knut = await testUtilsM.createTestKnut();
		const keg = knut.getKeg('sample');
		const nodeId = new NodeId(0);
		const node = await keg!.getNode(nodeId);
		expect(node?.title).toEqual('Sorry, planned but not yet available');
		const nodeContent = await keg?.storage
			.child('samplekeg')
			.read(NodeContent.filePath(nodeId));
		expect(node!.content).toEqual(nodeContent);
	});

	test('should be able to search through nodes', async () => {
		const knut = await testUtilsM.createTestKnut();
		const results = await knut.search({
			limit: 5,
			filter: { $text: { $search: 'lorem ipsum' } },
		});
		const topResult = results[0];
		expect(results.length).toBeLessThanOrEqual(5);
		expect(topResult.nodeId).toEqual('7');
	});
});
