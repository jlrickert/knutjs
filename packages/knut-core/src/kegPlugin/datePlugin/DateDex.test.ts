import { pipe } from 'effect';
import { expect, it } from 'vitest';
import invariant from 'tiny-invariant';
import { OptionalT, Future, Optional } from '../../internal/index.js';
import { TestUtils } from '../../internal/testUtils.js';
import { Keg } from '../../keg.js';
import { DateDex, DateDexConfig } from './DateDex.js';

const T = OptionalT.optionalT(Future.Monad);

TestUtils.describeEachBackend('DateDex', async ({ loadBackend }) => {
	it('should do the thing', async () => {
		const dex = new DateDex(
			new DateDexConfig({
				plugin: 'date',
				file: 'dex/changes.md',
				summary: null,
				tags: [],
			}),
		);
		const keg = await pipe(
			loadBackend(),
			T.chain((backend) => backend.loader('samplekeg1')),
			T.chain((keg) => Keg.fromStorage(keg)),
		);

		invariant(Optional.isSome(keg));
		for (const entry of keg.dex.entries) {
			dex.addEntry(entry);
		}
		expect(dex.entryList).length(keg.dex.entries.length);
	});
});
