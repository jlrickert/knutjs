import { expect, test } from 'vitest';
import { TestUtils } from './Testing/index.js';
import { Result } from './Utils/index.js';
import { KegFile } from './KegFile.js';

TestUtils.describeEachBackend('KegFile', async ({ loadBackend }) => {
	test('should be able to parse from a valid yaml file', async () => {
		const data = Result.unwrap(
			await TestUtils.fixtures.read('kegs/samplekeg1/keg'),
			'Expect file "kegs/samplekeg1" to exist in fixtures',
		);
		const kegFile = Result.unwrap(
			KegFile.fromYaml(data),
			'Expect valid yaml to not throw an error',
		);
		expect(kegFile.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile.data.url).toEqual('git@github.com:YOU/keg.git');
	});

	test('should be able to parse from keg storage', async () => {
		const backend = await loadBackend();
		for (const alias of TestUtils.kegAliasFixtures) {
			const storage = Result.unwrap(await backend.loader(alias));
			const kegFile = Result.unwrap(await KegFile.fromStorage(storage));
			expect(kegFile.data.title).toStrictEqual(
				expect.stringContaining('Sample Keg'),
			);
		}
	});
});
