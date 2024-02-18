import { test, describe, expect } from 'vitest';
import { KnutConfigFile } from './configFile.js';
import { testUtilsM } from './internal/testUtils.js';
import { KegFile } from './kegFile.js';
import { pipe } from 'fp-ts/lib/function.js';
import { promise } from './internal/myPromise.js';

describe('knutConfigFile', async () => {
	test('should be able load config files from storage', async () => {
		const fixture = await testUtilsM.createTestEnv();
		const original = await KnutConfigFile.fromStorage(fixture.config);
		const config = pipe(original, optionT.chain(promise.Monad)(a => a)) await original!.resolve(fixture.config.root);
		const kegConfig = config.getKeg('sample') ?? null;

		const storage = storageM.fromURI(kegConfig!.url);
		const kegFile = await KegFile.fromStorage(storage);
		expect(kegFile!.data.title).toEqual('A Sample Keg');
	});

	test('should be able to resolve to the right path when there is relative paths', async () => {
		const env = await testUtilsM.createTestEnv();
		const original = await KnutConfigFile.fromStorage(env.config);

		{
			const resolved = await original!.resolve(env.config.root);
			expect(resolved.data.kegs[0].url).toEqual(testUtilsM.sampleKegpath);
		}

		{
			const resolved = await original!.resolve(env.config.root);
			const kegfile = await resolved.relative(env.config.root);
			expect(kegfile.data.kegs[0].url).toEqual(
				original!.data.kegs[0].url,
			);
		}
	});
});
