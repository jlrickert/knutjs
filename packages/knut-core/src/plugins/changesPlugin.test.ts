import { describe, expect, test } from 'vitest';
import { testUtilsM } from '../internal/testUtils.js';
import { ChangesPlugin } from './changesPlugin.js';

describe('nodes plugin', () => {
	test('should be able to generate a valid dex/changes.md file', async () => {
		const keg = await testUtilsM.createTestKeg();
		const plugin = new ChangesPlugin();
		const content = await plugin.buildIndex(keg);
		const expected = await keg.storage.read('dex/changes.md');
		expect(content?.trim()).toEqual(expected?.trim());
	});
});
