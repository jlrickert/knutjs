import { pipe } from 'fp-ts/lib/function.js';
import invariant from 'tiny-invariant';
import { describe, expect, it } from 'vitest';
import { testUtils } from './testUtils.js';
import { Knut } from '../knut.js';
import { Keg } from '../keg.js';
import { Future, Optional, optionalT } from '../Utils/index.js';

for await (const { name, getBackend } of testUtils.backends) {
	describe(`${name} backend`, async () => {
		it('should have a filesystem with expected fixtures', async () => {
			const backend = await getBackend();
			const fixture = testUtils.fixtureStorage;

			expect(await backend.config.readdir('')).toStrictEqual(
				await fixture.child('config/knut').readdir(''),
			);
			for (const kegalias of ['samplekeg1', 'samplekeg2', 'samplekeg3']) {
				expect(
					(await backend.loader(kegalias))?.readdir(''),
				).toStrictEqual(fixture.child(kegalias).readdir(''));
			}
			expect(await fixture.readdir('')).not.toHaveLength(0);
		});

		it('should create keg data and config data', async () => {
			const backend = await getBackend();

			const fixtureData =
				await testUtils.fixtureStorage.read('samplekeg1/keg');
			const data = await pipe(
				await backend.loader('samplekeg1'),
				(ks) => ks?.read('keg'),
			);
			expect(fixtureData?.length).toBeGreaterThan(0);
			invariant(Optional.isSome(fixtureData));
			expect(fixtureData).toStrictEqual(data);
		});

		it('knut should be able to load a keg', async () => {
			const backend = await getBackend();
			const knut = await Knut.fromBackend(backend);

			const load = async (kegalias: string) => {
				const T = optionalT(Future.Monad);
				const keg = pipe(
					backend.loader(kegalias),
					T.chain(Keg.fromStorage),
					T.map((a) => a.kegFile.data),
				);
				return keg;
			};

			const testTable = [
				{
					l: await load('samplekeg1'),
					r: knut.getKeg('sample1')?.kegFile.data,
				},
				{
					l: await load('samplekeg2'),
					r: knut.getKeg('sample2')?.kegFile.data,
				},
				{
					l: await load('samplekeg3'),
					r: knut.getKeg('sample3')?.kegFile.data,
				},
			];

			for (const { l, r } of testTable) {
				expect(l).toStrictEqual(r);
				expect(l).toBeTruthy();
			}
		});
	});
}
