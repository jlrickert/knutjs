import { expect, test } from 'vitest';
import { TestUtils } from './Testing/index.js';
import { Result } from './Utils/index.js';
import { Dex } from './Dex.js';

TestUtils.describeEachBackend('Dex', async ({ loadBackend }) => {
	test('should be able to load the dex from the backend', async () => {
		const backend = await loadBackend();
		for (const kegAlias of TestUtils.kegAliasFixtures) {
			const storage = Result.unwrap(await backend.loader(kegAlias));
			const count = Result.unwrap(
				Result.map(
					await storage.readdir('.'),
					(list) => list.length - 3, // don't count the readme, dex, and keg file
				),
			);
			const dex = Result.unwrap(await Dex.fromStorage(storage));
			expect(dex.entries).toHaveLength(count);
		}
	});

	test('should be able to recreate the changes.md file', async () => {
		const backend = await loadBackend();
		for (const kegAlias of TestUtils.kegAliasFixtures) {
			const storage = Result.unwrap(await backend.loader(kegAlias));
			const actual = Result.unwrap(
				Result.map(await Dex.fromStorage(storage), (dex) =>
					dex.getChangesMDContent(),
				),
			);
			const expectedContent = Result.unwrap(
				await storage.read('dex/changes.md'),
			);
			expect(actual).toStrictEqual(expectedContent);
		}
	});
});
