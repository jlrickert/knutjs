import { describe, expect, test } from 'vitest';
import { KegFile } from './kegFile.js';
import { KegStorage } from './kegStorage.js';
import { testUtils } from './internal/testUtils.js';

describe('keg file', () => {
	test('should be able to parse from a valid yaml file', async () => {
		const fixture = testUtils.fixtureStorage;
		const data = await fixture.read('samplekeg1/keg');
		const kegFile = KegFile.fromYAML(data!);
		expect(kegFile.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile.data.url).toEqual('git@github.com:YOU/keg.git');
	});

	test('should be able to parse from keg storage', async () => {
		const fixture = testUtils.fixtureStorage;
		const kegFile = await KegFile.fromStorage(
			KegStorage.fromStorage(fixture.child('samplekeg1')),
		);
		expect(kegFile!.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile!.data.url).toEqual('git@github.com:YOU/keg.git');
	});
});
