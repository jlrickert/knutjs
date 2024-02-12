import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { TestKegContext, createTestKeg } from '../internal/testUtils.js';
import { NodesPlugin } from './nodesPlugin.js';

describe('nodes plugin', () => {
	let ctx: TestKegContext;
	beforeEach(async () => {
		ctx = await createTestKeg();
	});
	afterEach(async () => {
		await ctx.reset();
	});
	test('should be able to generate a valid nodes.tsv file', async () => {
		const plugin = new NodesPlugin();
		const content = await plugin.buildIndex(ctx.keg);
		const expected = await ctx.keg.storage.read('dex/nodes.tsv');
		expect(content?.trim()).toEqual(expected?.trim());
	});
});
