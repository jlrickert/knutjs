import { describe, expect, test } from 'vitest';
import invariant from 'tiny-invariant';
import { KegSystemStorage } from './systemStorage';
import { KegMemoryStorage } from './memoryStorage';
import { sampleKegpath } from '../internal/testUtils';

describe('describe memory storage', () => {
	test('should be able to copy data from file other storage systems', async () => {
		const fsStorage = new KegSystemStorage({ kegpath: sampleKegpath });
		const storage = await KegMemoryStorage.copyFrom(fsStorage);
		expect(storage).toBeTruthy();
		invariant(storage, 'Expect storage to copy over without issues');
		const content = await storage.read('dex/nodes.tsv');
		expect(content).toBeTruthy();
		expect(content).matchSnapshot();
	});

	test('should be able to list all nodes', async () => {
		const fsStorage = new KegSystemStorage({ kegpath: sampleKegpath });
		const storage = await KegMemoryStorage.copyFrom(fsStorage);
		expect(storage).toBeTruthy();
		invariant(storage, 'Expect storage to defined');
		const nodes = await storage.listNodes();
		expect(nodes.map((a) => Number(a.stringify()))).toStrictEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
		]);
	});
});
