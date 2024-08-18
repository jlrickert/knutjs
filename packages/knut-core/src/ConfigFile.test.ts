import { test, expect } from 'vitest';
import { pipe } from 'fp-ts/lib/function.js';
import { KnutConfigFile } from './ConfigFile.js';
import { Optional, Result } from './Utils/index.js';
import { TestUtils } from './Testing/index.js';

TestUtils.describeEachBackend('KnutConfigFile', async ({ loadBackend }) => {
	test('should be able load config files from storage', async () => {
		const backend = await loadBackend();
		const fixtureData = Result.unwrap(
			await TestUtils.fixtureStorage.read('config/knut/config.yaml'),
		);
		const expectedData = Result.unwrap(
			await KnutConfigFile.fromYAML(fixtureData),
		);
		const config = await KnutConfigFile.fromStorage(backend.config);
		expect(Result.unwrap(config).data).toStrictEqual(expectedData.data);
	});

	test('should should be able to resolve relative paths', async () => {
		const backend = await loadBackend();
		const config = Result.unwrap(
			await KnutConfigFile.fromStorage(backend.config),
		);
		expect(config.resolve().relative().data).toStrictEqual(config?.data);
		expect(config.resolve().getKeg('sample1')?.url).toEqual(
			pipe(
				await backend.loader('samplekeg1'),
				Result.map((a) => a.uri),
				(a) => Optional.fromResult(a),
			),
		);
	});
});
