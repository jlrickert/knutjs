import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { TestContext, createSampleKnutApp } from './internal/testUtils.js';
import { KegStorage } from './kegStorage.js';
import { collectAsync } from './utils.js';

describe('keg storage', () => {
	let ctx!: TestContext;

	beforeEach(async () => {
		ctx = await createSampleKnutApp();
	});

	afterEach(async () => {
		await ctx.reset();
	});

	test('should be able to list nodes', async () => {
		const storage = KegStorage.fromStorage(ctx.storage.child('samplekeg'));
		expect(await collectAsync(storage.listNodes())).toHaveLength(13);
	});
});
