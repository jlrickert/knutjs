import invariant from 'tiny-invariant';
import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import { pipe } from 'fp-ts/lib/function.js';
import { TestKegContext, createTestKeg } from './internal/testUtils.js';
import { collectAsync } from './utils.js';

describe('keg', () => {
	let ctx: TestKegContext;

	beforeEach(async () => {
		ctx = await createTestKeg();
	});

	afterAll(async () => {
		await ctx.reset();
	});

	test('should be able to create a node', async () => {
		const prevCount = pipe(
			await collectAsync(ctx.keg.storage.listNodes()),
			(a) => a.length,
		);
		const nodeId = await ctx.keg.createNode();
		const count = pipe(
			await collectAsync(ctx.keg.storage.listNodes()),
			(a) => a.length,
		);
		expect(count - prevCount).toEqual(1);
		const node = await ctx.keg.getNode(nodeId);
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
});
