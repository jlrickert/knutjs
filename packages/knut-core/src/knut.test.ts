import path from 'path';
import { test, describe, expect } from 'vitest';
import { Knut } from './knut';

const sampleKegpath = path.resolve(__dirname, '../', 'testdata', 'samplekeg');

describe('common programming patterns', () => {
	test('should be able to create a new node', () => {
		const knut = Knut.load({ [sampleKegpath]: {} });

		const node = knut.nodeCreate({
			kegpath: sampleKegpath,
			content: `# Some title`,
		});
		const nodeList = knut.search(sampleKegpath);
		expect(nodeList).contains(node.id);
	});

	test('should be able read a node for a given node path', () => {
		const knut = Knut.load({ [sampleKegpath]: {} });

		const node = knut.nodeRead({ kegpath: sampleKegpath, nodeId: '2' });
		expect(node.content).toEqual('# Some title for 2');
		expect(node.title).toEqual('Some title for 2');
	});

	test('should be able to find nodes with a specific tag', () => {
		const knut = Knut.load({ [sampleKegpath]: {} });

		const list = knut.search(sampleKegpath, {
			tags: { $eq: 'example' },
		});
		expect(list).includes(10);
		expect(list).includes(12);
	});

	test('should be able to share with some one', () => {
		const knut = Knut.load({ [sampleKegpath]: {} });

		const link = knut.share({ kegpath: sampleKegpath, nodeId: '12' });
		expect(link).toEqual('https://whatisthis.com');
	});
});
