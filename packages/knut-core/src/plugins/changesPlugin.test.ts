import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { TestKegContext, createTestKeg } from '../internal/testUtils';
import { ChangesPlugin } from './changesPlugin';

describe('nodes plugin', () => {
	let ctx: TestKegContext;
	beforeEach(async () => {
		ctx = await createTestKeg();
	});
	afterEach(async () => {
		await ctx.reset();
	});
	test('should be able to generate a valid dex/changes.md file', async () => {
		const plugin = new ChangesPlugin();
		const content = await plugin.buildIndex(ctx.keg);
		const expected = await ctx.keg.storage.read('dex/changes.md');
		expect(content?.trim()).toEqual(expected?.trim());
	});
});
