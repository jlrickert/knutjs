import { pipe } from 'fp-ts/lib/function.js';
import invariant from 'tiny-invariant';
import { expect, it } from 'vitest';
import { TestUtils, testUtils } from './testUtils.js';
import { Knut } from '../knut.js';
import { Keg } from '../keg.js';
import { optionalT } from './optionalT.js';
import { Optional, Future } from './index.js';

TestUtils.describeEachBackend('Test utils', async ({ loadBackend }) => {
	it('should have a filesystem with expected fixtures', async () => {
		const backend = await loadBackend();
		const fixture = testUtils.fixtureStorage;

		expect(await backend.config.readdir('')).toStrictEqual(
			await fixture.child('config/knut').readdir(''),
		);
		for (const kegalias of ['samplekeg1', 'samplekeg2', 'samplekeg3']) {
			expect((await backend.loader(kegalias))?.readdir('')).toStrictEqual(
				fixture.child(kegalias).readdir(''),
			);
		}
		expect(await fixture.readdir('')).not.toHaveLength(0);
	});

	it('should create keg data and config data', async () => {
		const backend = await loadBackend();

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
		const backend = await loadBackend();
		const knut = await Knut.fromBackend(backend);

		const load = async (kegalias: string) => {
			const T = optionalT(Future.Monad);
			return pipe(
				backend.loader(kegalias),
				T.chain(Keg.fromStorage),
				T.map((a) => a.config.current.data),
			);
		};

		const testTable = [
			{
				l: await load('samplekeg1'),
				r: knut.getKeg('sample1')?.config.current.data,
			},
			{
				l: await load('samplekeg2'),
				r: knut.getKeg('sample2')?.config.current.data,
			},
			{
				l: await load('samplekeg3'),
				r: knut.getKeg('sample3')?.config.current.data,
			},
		];

		for (const { l, r } of testTable) {
			expect(l).toStrictEqual(r);
			expect(l).toBeTruthy();
		}
	});
});
