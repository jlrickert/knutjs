import { pipe } from 'fp-ts/lib/function.js';
import invariant from 'tiny-invariant';
import { expect, it } from 'vitest';
import { TestUtils } from './testUtils.js';
import { Knut } from '../knut.js';
import { Keg } from '../keg.js';
import { Optional, Future } from './index.js';

TestUtils.describeEachBackend('TestUtils', async ({ loadBackend }) => {
	it('should have a filesystem with expected fixtures', async () => {
		const backend = await loadBackend();
		const fixture = TestUtils.fixtureStorage;

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

		const fixtureData = await TestUtils.fixtureStorage.read(
			'kegs/samplekeg1/keg',
		);
		const data = await pipe(
			await backend.loader('kegs/samplekeg1'),
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
			const keg = await Keg.fromBackend({ uri: kegalias, backend });
			if (Optional.isNone(keg)) {
				return Optional.none;
			}
			return keg?.config.data;
		};

		const testTable = [
			{
				l: await load('samplekeg1'),
				r: knut.getKeg('sample1')?.config.data,
			},
			{
				l: await load('samplekeg2'),
				r: knut.getKeg('sample2')?.config.data,
			},
			{
				l: await load('samplekeg3'),
				r: knut.getKeg('sample3')?.config.data,
			},
		];

		for (const { l, r } of testTable) {
			expect(l).toStrictEqual(r);
			expect(l).toBeTruthy();
		}
	});
});
