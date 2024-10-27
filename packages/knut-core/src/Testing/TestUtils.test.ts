import { describe, expect, it } from 'vitest';
import { FutureResult, pipe, Result } from '../Utils/index.js';
import { TestUtils } from './index.js';

describe('TestUtils.fixtures', () => {
	it('should have access to files', async () => {
		const root = Result.unwrap(await TestUtils.fixtures.readdir('/'));
		expect(root).not.toHaveLength(0);
		expect(root).toStrictEqual(
			expect.arrayContaining(['cache', 'config', 'local', 'kegs']),
		);
		const kegsDir = Result.unwrap(
			await TestUtils.fixtures.readdir('/kegs'),
		);
		expect(kegsDir).not.toHaveLength(0);
		expect(kegsDir).toStrictEqual(
			TestUtils.kegAliasFixtures.map((alias) => `${alias}`),
		);
	});
});

for await (const { name, loadBackend } of TestUtils.backends) {
	describe(`${name} backend`, async () => {
		it('should load data fixtures', async () => {
			const backend = await loadBackend();
			expect(
				Result.unwrap(await backend.data.readdir('.')),
			).toStrictEqual(['.empty']);
		});

		it('should load state fixutures', async () => {
			const backend = await loadBackend();
			expect(
				Result.unwrap(await backend.state.readdir('.')),
			).toStrictEqual(['.empty']);
		});

		it('should load config fixutures', async () => {
			const backend = await loadBackend();
			expect(
				Result.unwrap(await backend.config.readdir('.')),
			).toStrictEqual(['config.yaml']);
		});

		it('should load cache fixutures', async () => {
			const backend = await loadBackend();
			expect(
				Result.unwrap(await backend.cache.readdir('.')),
			).toStrictEqual(['.empty']);
		});

		it('should load the keg fixtures', async () => {
			const backend = await loadBackend();
			for (const alias of TestUtils.kegAliasFixtures) {
				const rawKegConfigContent = await pipe(
					backend.loader(alias),
					FutureResult.chain((s) => {
						return s.read('keg');
					}),
				);

				expect(rawKegConfigContent).toStrictEqual(
					Result.ok(expect.stringContaining('kegv:    2023-01')),
				);
			}
		});
	});
}
