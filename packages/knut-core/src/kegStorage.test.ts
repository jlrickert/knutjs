import { describe, expect, test } from 'vitest';
import { testUtils } from './internal/testUtils.js';
import { KegStorage } from './KegStore.js';
import { collectAsync } from './Utils/index.js';

for await (const { name, getBackend } of testUtils.backends) {
	describe(`${name} backend - keg storage`, () => {
		test('should be able to list nodes', async () => {
			const backend = await getBackend();
			const storage = await backend.loader('samplekeg1');
			const ks = KegStorage.fromStorage(storage!);
			expect(await collectAsync(ks.listNodes())).toHaveLength(13);
		});
	});
}
