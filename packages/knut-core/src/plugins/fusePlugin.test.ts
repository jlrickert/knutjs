import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { TestKegContext, createTestKeg } from '../internal/testUtils.js';
import { SearchResult } from '../internal/plugins/searchPlugin.js';
import {
	FUSE_DATA_FILE,
	FUSE_INDEX_FILE,
	FuseKegPlugin,
} from './fusePlugin.js';

describe('nodes plugin', () => {
	let ctx: TestKegContext;
	beforeEach(async () => {
		ctx = await createTestKeg();
	});
	afterEach(async () => {
		await ctx.reset();
	});
	test('should be able to search', async () => {
		const plugin = new FuseKegPlugin();
		const results = await plugin.search(ctx.keg, {
			filter: { $text: { $search: 'lorem ipsum' } },
		});
		expect(results[0]).toStrictEqual(
			expect.objectContaining<Pick<SearchResult, 'nodeId'>>({
				nodeId: '7',
			}),
		);
	});

	test('should create index and data file on update', async () => {
		const plugin = new FuseKegPlugin();
		await plugin.update(ctx.keg);
		const root = (await ctx.keg.cache.readdir(''))![0];
		const storage = ctx.keg.cache.child(root);
		const data = await storage.read(FUSE_DATA_FILE);
		const index = await storage.read(FUSE_INDEX_FILE);
		expect(data).not.toHaveLength(0);
		expect(JSON.parse(data!)).toEqual(await plugin.buildData(ctx.keg));
		expect(index).not.toHaveLength(0);
	});
});
