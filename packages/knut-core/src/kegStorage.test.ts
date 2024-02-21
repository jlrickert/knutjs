import { describe, expect, test } from 'vitest';
import { collectAsync } from './utils.js';
import { TestContext } from './internal/testUtils.js';
import { KegStorage } from './kegStorage.js';

describe('keg storage', () => {
	test('should be able to list nodes', async () => {
		const context = await TestContext.nodeContext();
		await context.popluateFixture();
		const ks = KegStorage.fromStorage(context.root.child('samplekeg1'));
		expect(await collectAsync(ks.listNodes())).toHaveLength(13);
	});
});
