import { describe, expect, test } from 'vitest';
import { NodesPlugin } from './nodesPlugin.js';
import { testUtilsM } from '../internal/testUtils.js';

describe('nodes plugin', () => {
	test('should be able to generate a valid nodes.tsv file', async () => {
		const keg = await testUtilsM.createTestKeg();
		console.log(keg);
		const plugin = new NodesPlugin();
		const content = await plugin.buildIndex(keg);
		const expected = await keg.storage.read('dex/nodes.tsv');
		expect(content?.trim()).toEqual(expected?.trim());
	});
});
