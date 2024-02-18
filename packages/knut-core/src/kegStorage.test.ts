import { describe, expect, test } from 'vitest';
import { testUtilsM } from './internal/testUtils.js';
import { KegStorage } from './kegStorage.js';
import { collectAsync } from './utils.js';
import { pipe } from 'fp-ts/lib/function.js';

describe('keg storage', () => {
	test('should be able to list nodes', async () => {
		const storage = pipe(
			await testUtilsM.createSamplekegStorage(),
			KegStorage.fromStorage,
		);
		expect(await collectAsync(storage.listNodes())).toHaveLength(13);
	});
});
