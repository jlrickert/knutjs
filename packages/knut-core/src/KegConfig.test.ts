import { describe, expect, test } from 'vitest';
import { KegConfig } from './KegConfig.js';
import { KegStorage } from './kegStorage.js';
import { TestUtils } from './internal/testUtils.js';

describe('keg file', () => {
	test('should be able to parse from a valid yaml file', async () => {
		const fixture = TestUtils.fixtureStorage;
		const data = await fixture.read('samplekeg1/keg');
		const kegFile = KegConfig.fromYAML(data!);
		expect(kegFile.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile.data.url).toEqual('git@github.com:YOU/keg.git');
		expect(kegFile.data.updated).toEqual('2022-11-26 19:33:24Z');
	});

	test('should be isomorphic', async () => {
		const fixture = TestUtils.fixtureStorage.child('samplekeg1');
		const config = await KegConfig.fromStorage(fixture);
		expect(KegConfig.fromYAML(config!.toYAML())).toStrictEqual(config);
		expect(KegConfig.fromJSON(config!.toJSON())).toStrictEqual(config);
	});

	test('should be able to parse from keg storage', async () => {
		const fixture = TestUtils.fixtureStorage;
		const kegFile = await KegConfig.fromStorage(
			KegStorage.fromStorage(fixture.child('samplekeg1')),
		);
		expect(kegFile!.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile!.data.url).toEqual('git@github.com:YOU/keg.git');
	});

	test('should be able to merge data', async () => {
		const fixture = TestUtils.fixtureStorage;
		const kegFile = await KegConfig.fromStorage(
			KegStorage.fromStorage(fixture.child('samplekeg1')),
		);
		const originalKegFile = kegFile!.clone();
		kegFile!.mergeData({
			indexes: [
				{
					plugin: 'date',
					file: 'dex/baking.md',
					summary: 'all baking nodes',
					args: { tags: ['baking'] },
				},
			],
		});
		expect(kegFile?.data.indexes).toHaveLength(
			originalKegFile.data.indexes!.length + 1,
		);
		expect(kegFile?.data.indexes).toStrictEqual([
			{ file: 'dex/nodes.tsv', summary: 'all nodes by id' },
			{
				plugin: 'date',
				file: 'dex/changes.md',
				summary: 'latest changes',
			},
			{ plugin: 'tags', file: 'dex/tags.md', summary: 'all tags' },
			{
				plugin: 'date',
				file: 'dex/baking.md',
				summary: 'all baking nodes',
				args: { tags: ['baking'] },
			},
		]);
	});
});
