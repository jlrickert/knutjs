import { describe, expect, test } from 'vitest';
import { SearchResult } from '../internal/plugins/searchPlugin.js';
import {
	FUSE_DATA_FILE,
	FUSE_INDEX_FILE,
	FuseKegPlugin,
} from './fusePlugin.js';
import { testUtilsM } from '../internal/testUtils.js';

describe('nodes plugin', () => {
	test('should be able to search', async () => {
		const keg = await testUtilsM.createTestKeg();
		const plugin = new FuseKegPlugin();
		const results = await plugin.search(keg, {
			filter: { $text: { $search: 'lorem ipsum' } },
		});
		expect(results[0]).toStrictEqual(
			expect.objectContaining<Pick<SearchResult, 'nodeId'>>({
				nodeId: '7',
			}),
		);
	});

	test('should create index and data file on update', async () => {
		const keg = await testUtilsM.createTestKeg();
		const plugin = new FuseKegPlugin();
		await plugin.update(keg);
		const root = (await keg.env.cache.readdir(''))![0];
		const storage = keg.env.cache.child(root);
		const data = await storage.read(FUSE_DATA_FILE);
		const index = await storage.read(FUSE_INDEX_FILE);
		expect(data).not.toHaveLength(0);
		expect(JSON.parse(data!)).toEqual(await plugin.buildData(keg));
		expect(index).not.toHaveLength(0);
	});
});
