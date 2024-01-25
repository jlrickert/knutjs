import { describe, expect, test } from 'vitest';
import { KegSystemStorage } from './systemStorage';
import { sampleKegpath } from '../internal/testUtils';

describe('keg system storage', () => {
	test('should be able read dex data', async () => {
		const storage = new KegSystemStorage({ kegpath: sampleKegpath });
		const content = await storage.read('dex/nodes.tsv');
		expect(content).matchSnapshot(
			'index of all nodes and when they updated',
		);
	});

	test('should be able to list all nodes', async () => {
		const storage = new KegSystemStorage({ kegpath: sampleKegpath });
		const nodes = await storage.listNodes();
		expect(nodes.map((a) => Number(a.stringify()))).toStrictEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
		]);
	});
});
