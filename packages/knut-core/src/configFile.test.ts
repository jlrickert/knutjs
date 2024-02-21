import { test, describe, expect } from 'vitest';
import { pipe } from 'fp-ts/lib/function.js';
import { KnutConfigFile } from './configFile.js';
import { TestContext } from './internal/testUtils.js';
import { optionalT } from './internal/optionalT.js';
import { future } from './internal/future.js';

describe('knutConfigFile', async () => {
	test('should be able load config files from storage', async () => {
		const context = await TestContext.nodeContext();
		await context.popluateFixture();
		const original = await KnutConfigFile.fromStorage(
			context.root.child('config/knut'),
		);
		const T = optionalT(future.Monad);
		const data = pipe(
			context.fixture.read('config/knut/config.yaml'),
			T.map(KnutConfigFile.fromYAML),
		);
		expect(original?.data).toStrictEqual(expect.objectContaining(data));
	});

	test('should should be able to resolve relative paths', async () => {
		const context = await TestContext.nodeContext();
		await context.popluateFixture();
		const env = await context.getEnv();
		const config = await KnutConfigFile.fromStorage(env.config);
		expect(config?.resolve().relative().data).toEqual(config?.data);
		expect(config?.resolve().getKeg('sample1')?.url).toEqual(
			context.root.child('samplekeg1').root,
		);
	});
});
