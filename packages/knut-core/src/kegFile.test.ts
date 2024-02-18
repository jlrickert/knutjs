import { describe, expect, test } from 'vitest';
import { testUtilsM } from './internal/testUtils.js';
import { KegFile } from './kegFile.js';

describe('keg file', () => {
	test('should be able to parse from a valid yaml file', async () => {
		const fixture = await testUtilsM.createSamplekegStorage();
		const data = await fixture.read('keg');
		const kegFile = KegFile.fromYAML(data!);
		expect(kegFile.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile.data.url).toEqual('git@github.com:YOU/keg.git');
	});

	test('should be able to parse from keg storage', async () => {
		const fixture = await testUtilsM.createSamplekegStorage();
		const kegFile = await KegFile.fromStorage(fixture);
		expect(kegFile!.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile!.data.url).toEqual('git@github.com:YOU/keg.git');
	});
});
