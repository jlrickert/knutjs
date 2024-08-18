import { pipe } from 'fp-ts/lib/function.js';
import invariant from 'tiny-invariant';
import { describe, expect, it } from 'vitest';
import { Knut } from '../knut.js';
import { Keg } from '../keg.js';
import { FutureResult, Result } from '../Utils/index.js';
import { TestUtils } from './index.js';

for await (const { name, loadBackend } of TestUtils.backends) {
	describe(`${name} backend`, async () => {
		it('should have a filesystem with expected fixtures', async () => {
			const backend = await loadBackend();
			const fixture = TestUtils.fixtureStorage;

			expect(await backend.config.readdir('')).toStrictEqual(
				await fixture.child('config/knut').readdir(''),
			);
			for (const kegalias of ['samplekeg1', 'samplekeg2', 'samplekeg3']) {
				const storage = Result.getOk(await backend.loader(kegalias));
				expect(storage?.readdir('')).toStrictEqual(
					fixture.child(kegalias).readdir(''),
				);
			}
			expect(await fixture.readdir('')).not.toHaveLength(0);
		});

		// it('should create keg data and config data', async () => {
		// 	const backend = await loadBackend();
		//
		// 	const fixtureData =
		// 		await TestUtils.fixtureStorage.read('samplekeg1/keg');
		// 	const data = await pipe(
		// 		backend.loader('samplekeg1'),
		// 		FutureResult.chain((ks) => ks.read('keg')),
		// 	);
		// 	const dataLength = Result.map(fixtureData, (a) => a.length);
		// 	invariant(Result.isOk(dataLength));
		// 	expect(dataLength.value).toBeGreaterThan(0);
		// 	expect(fixtureData).toStrictEqual(data);
		// });
		//
		// it('knut should be able to load a keg', async () => {
		// 	const backend = await loadBackend();
		// 	const knut = await Knut.fromBackend(backend);
		//
		// 	const load = async (kegalias: string) => {
		// 		const storage = await backend.loader(kegalias);
		// 		const keg = await pipe(
		// 			backend.loader(kegalias),
		// 			FutureResult.chain(async (a) => {
		// 				const x = await Keg.fromStorage(a);
		// 				return FutureResult.fromOptional(x, () => 'x');
		// 			}),
		// 			FutureResult.map((a) => a.kegFile.data),
		// 		);
		// 		return keg;
		// 	};
		//
		// 	const testTable = [
		// 		{
		// 			l: await load('samplekeg1'),
		// 			r: knut.getKeg('sample1')?.kegFile.data,
		// 		},
		// 		{
		// 			l: await load('samplekeg2'),
		// 			r: knut.getKeg('sample2')?.kegFile.data,
		// 		},
		// 		{
		// 			l: await load('samplekeg3'),
		// 			r: knut.getKeg('sample3')?.kegFile.data,
		// 		},
		// 	];
		//
		// 	for (const { l, r } of testTable) {
		// 		expect(l).toStrictEqual(r);
		// 		expect(l).toBeTruthy();
		// 	}
		// });
	});
}
