import { test, describe, expect } from 'vitest';
import { KnutConfigFile } from './configFile.js';
import { knutConfigPath } from './internal/testUtils.js';
import { loadStorage } from './storage/storage.js';
import { loadKegStorage } from './kegStorage.js';
import { KegFile } from './kegFile.js';

describe('knutConfigFile', async () => {
	test('should be able load config files from storage', async () => {
		const storage = loadStorage(knutConfigPath);
		const config = await KnutConfigFile.fromStorage(storage);
		const kegConfig = config?.getKeg('sample') ?? null;
		const kegpath = kegConfig ? await storage.resolve(kegConfig.url) : null;

		const kegStorage = kegpath ? loadKegStorage(kegpath) : null;
		const kegFile = kegStorage
			? await KegFile.fromStorage(kegStorage)
			: null;
		expect(kegFile?.data.title).toEqual('A Sample Keg');
	});
});
