import { test, expect, describe } from 'vitest';
import { KnutConfigFile } from './KnutConfigFile.js';
import { pipe, Result } from './Utils/index.js';
import { TestUtils } from './Testing/index.js';

TestUtils.describeEachBackend('KnutConfigFile', async ({ loadBackend }) => {
	test('should be able to load config files from storage', async () => {
		const backend = await loadBackend();
		const data = pipe(
			await KnutConfigFile.fromStore(backend.config),
			Result.map((a) => a.data),
			(a) => Result.unwrap(a),
		);
		expect(data.kegs).length(3);
		expect(data.kegs[0].alias).toStrictEqual('samplekeg1');
		expect(data.kegs[1].alias).toStrictEqual('samplekeg2');
		expect(data.kegs[2].alias).toStrictEqual('samplekeg3');
	});

	test('should be able to merge configurations', () => {
		const a = KnutConfigFile.create();
		a.upsertKegConfig({ alias: 'kegA', url: '/keg/a', enabled: true });
		const b = KnutConfigFile.create();
		b.upsertKegConfig({ alias: 'kegB', url: '/keg/b', enabled: true });
		const c = KnutConfigFile.create();
		c.upsertKegConfig({ alias: 'kegB', url: '/keg/newb', enabled: true });
		const mergedConf = KnutConfigFile.merge(a, b, c);
		expect(mergedConf.data.kegs).toHaveLength(2);
		expect(mergedConf.getKeg('kegB')?.url).toStrictEqual('/keg/newb');
	});
});

describe('knutConfigFile', () => {
	test('memory storage', async () => {
		const backend = await TestUtils.testMemoryBackend();
		const config = Result.unwrap(
			await KnutConfigFile.fromStore(backend.config),
		);
		expect(config.root).toStrictEqual('memory-fs');
	});
});
