import { describe, expect, test } from 'vitest';
import { KegFile } from './kegFile.js';
import { TestContext } from './internal/testUtils.js';
import { KegStorage } from './kegStorage.js';

describe('keg file', () => {
	test('should be able to parse from a valid yaml file', async () => {
		const context = await TestContext.nodeContext();
		const data = await context.fixture.read('samplekeg1/keg');
		const kegFile = KegFile.fromYAML(data!);
		expect(kegFile.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile.data.url).toEqual('git@github.com:YOU/keg.git');
	});

	test('should be able to parse from keg storage', async () => {
		const context = await TestContext.nodeContext();
		const kegFile = await KegFile.fromStorage(
			KegStorage.fromStorage(context.fixture.child('samplekeg1')),
		);
		expect(kegFile!.data.creator).toEqual('git@github.com:YOU/YOU.git');
		expect(kegFile!.data.url).toEqual('git@github.com:YOU/keg.git');
	});
});
