import { test, describe, expect } from 'vitest';
import { pipe } from 'fp-ts/lib/function.js';
import { KnutConfigFile } from './configFile.js';
import { testUtils } from './internal/testUtils.js';
import { optionalT } from './internal/optionalT.js';
import { future } from './internal/future.js';

for await (const { name, getBackend } of testUtils.backends) {
	describe(`knutConfigFile - ${name} backend`, async () => {
		test('should be able load config files from storage', async () => {
			const backend = await getBackend();
			const original = await KnutConfigFile.fromStorage(backend.config);
			const T = optionalT(future.Monad);
			const data = pipe(
				testUtils.fixtureStorage.read('config/knut/config.yaml'),
				T.map(KnutConfigFile.fromYAML),
			);
			expect(original?.data).toStrictEqual(expect.objectContaining(data));
		});

		test('should should be able to resolve relative paths', async () => {
			const backend = await getBackend();
			const config = await KnutConfigFile.fromStorage(backend.config);
			expect(config?.resolve().relative().data).toStrictEqual(
				config?.data,
			);
			expect(config?.resolve().getKeg('sample1')?.url).toEqual(
				await pipe(
					backend.loader('samplekeg1'),
					future.map((a) => a?.root),
				),
			);
		});
	});
}
