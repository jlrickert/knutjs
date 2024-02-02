import * as Path from 'path';
import { test, describe, expect, beforeEach, afterEach } from 'vitest';
import { KnutConfigFile } from './configFile.js';
import {
	TestContext,
	createSampleKnutApp,
	knutConfigPath,
} from './internal/testUtils.js';
import { loadStorage } from './storage/storage.js';
import { loadKegStorage } from './kegStorage.js';
import { KegFile } from './kegFile.js';
import { FsStorage } from './storage/fsStorage.js';
import invariant from 'tiny-invariant';

describe('knutConfigFile', async () => {
	let ctx!: TestContext;

	beforeEach(async () => {
		ctx = await createSampleKnutApp();
	});

	afterEach(async () => {
		await ctx.reset();
	});

	test('should be able load config files from storage', async () => {
		const storage = loadStorage(knutConfigPath);
		invariant(storage instanceof FsStorage);
		const original = await KnutConfigFile.fromStorage(storage);
		const config = await original!.resolve(storage.getRoot());
		const kegConfig = config.getKeg('sample') ?? null;
		const kegpath = kegConfig!.url;

		const kegStorage = loadKegStorage(kegpath);
		const kegFile = kegStorage
			? await KegFile.fromStorage(kegStorage)
			: null;
		expect(kegFile!.data.title).toEqual('A Sample Keg');
	});

	test('should be able to resolve to the right path when there is relative paths', async () => {
		const storage = ctx.storage.child('config/knut');
		invariant(storage instanceof FsStorage);
		const original = await KnutConfigFile.fromStorage(storage);

		{
			const resolved = await original!.resolve(
				storage instanceof FsStorage ? storage.getRoot() : '',
			);
			expect(resolved.data.kegs[0].url).toEqual(
				Path.join(storage.child('../..').getRoot(), 'samplekeg'),
			);
		}

		{
			const resolved = await original!.resolve(
				storage instanceof FsStorage ? storage.getRoot() : '',
			);
			const kegfile = await resolved.relative(storage.getRoot());
			expect(kegfile.data.kegs[0].url).toEqual(
				original!.data.kegs[0].url,
			);
		}
	});
});
