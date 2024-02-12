import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
	TestContext,
	createSampleKnutApp,
	sampleKegpath,
} from './internal/testUtils.js';
import { KegFile } from './kegFile.js';
import { KegStorage } from './kegStorage.js';

describe('keg file', () => {
	let ctx: TestContext;
	beforeEach(async () => {
		ctx = await createSampleKnutApp();
	});
	afterEach(async () => {
		await ctx.reset();
	});
	test('should be able to parse from a valid yaml file', async () => {
		const data = await ctx.storage.read('sampleKeg/keg');
		const kegFile = KegFile.fromYAML(data!);
		expect(kegFile.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile.data.url).toEqual('git@github.com:YOU/keg.git');
	});

	test('should be able to parse from keg storage', async () => {
		const storage = KegStorage.fromStorage(
			ctx.storage.child(sampleKegpath),
		);
		const kegFile = await KegFile.fromStorage(storage);
		expect(kegFile!.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile!.data.url).toEqual('git@github.com:YOU/keg.git');
	});
});
