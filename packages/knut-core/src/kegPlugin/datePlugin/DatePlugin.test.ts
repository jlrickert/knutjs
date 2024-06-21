import { pipe, Array } from 'effect';
import { expect, it } from 'vitest';
import invariant from 'tiny-invariant';
import { Keg } from '../../keg.js';
import { Optional, OptionalT, Future } from '../../internal/index.js';
import { IndexEntryData, KegConfig } from '../../KegConfig.js';
import { Dex, DexEntry } from '../../Dex.js';
import { NodeId } from '../../KegNode.js';
import { TestUtils } from '../../internal/testUtils.js';
import { DateKegPlugin } from './DatePlugin.js';
import { DateDexConfig } from './DateDex.js';

const T = OptionalT.optionalT(Future.Monad);

const changesDexConfig: Pick<DateDexConfig, 'file' | 'tags'> = {
	file: 'dex/changes.md',
	tags: [],
};

export const mergeDefaults = (
	config: Pick<DateDexConfig, 'file' | 'tags'>,
): DateDexConfig => {
	return new DateDexConfig({
		...config,
		plugin: 'date',
		summary: 'Example of the date plugin',
	});
};

const ConfigTest = (config?: {
	enabled?: boolean;
	options?: { tags?: string[]; file: string }[];
}): KegConfig => {
	return new KegConfig({
		plugins: [{ name: 'date', enable: config?.enabled ?? true }],
		indexes: pipe(
			config?.options ?? [changesDexConfig],
			Array.map(
				(a): IndexEntryData => ({
					plugin: 'date',
					summary: 'Example of the data plugin',
					file: a.file,
					args: {
						tags: a.tags ? [...a.tags] : null,
					},
				}),
			),
		),
	});
};
const DexTest = (): Dex => {
	const dex = new Dex();
	for (const entry of dexEntryFixture) {
		dex.addEntry(entry);
	}
	return dex;
};

const now = new Date();
const dexEntryFixture = pipe(
	Array.range(0, 99),
	Array.map(
		(i) =>
			new DexEntry({
				title: `Entry ${i + 1}`,
				updated: new Date(now.getTime() + 1000 * 60 * i),
				nodeId: new NodeId(i),
			}),
	),
);

TestUtils.describeEachBackend('KegDatePlugin', async ({ loadBackend }) => {
	it('should contain the same number of nodes in change.md', async () => {
		const dex = DexTest();
		const config = ConfigTest();
		const plugin = DateKegPlugin;
		const keg = await pipe(
			loadBackend(),
			T.chain((backend) => backend.loader('samplekeg1')),
			T.chain((keg) => Keg.fromStorage(keg)),
		);
		await plugin.init(keg!);
		invariant(
			Optional.isSome(keg),
			'Expect samplekeg1 to be available in the fixture',
		);
		await plugin.init();
		expect(plugin.isEnabled()).toBeTruthy();
		expect(plugin.dexList).toHaveLength(1);
		expect(plugin.dexList[0].entryList).toHaveLength(dex.entries.length);
	});
});
