import * as Path from 'path';
import { describe, expect, test } from 'vitest';
import { FileSystemStorage } from './storage.js';
import invariant from 'tiny-invariant';

describe('file system storage', () => {
	test('should be able to find the nearest keg', async () => {
		const kegfile = await FileSystemStorage.findNearestKegpath();
		const sampleKegpath = Path.resolve(
			__dirname,
			'..',
			'testdata',
			'samplekeg',
		);
		expect(kegfile).toBe(sampleKegpath);
	});

	test('should be able to read data', async () => {
		const storage = await FileSystemStorage.findNearest();
		invariant(storage !== null, 'Expect to be true');
		const md = await storage.read('0/README.md');
		expect(md).toEqual(
			`
# Sorry, planned but not yet available

This is a filler until I can provide someone better for the link that brought
you here. If you are really anxious, consider opening an issue describing why
you would like this missing content created before the rest.
`.trimStart(),
		);
	});
});
