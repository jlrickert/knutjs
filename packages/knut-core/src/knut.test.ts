import path from 'path';
import { test, describe, expect } from 'vitest';
import { Knut } from './knut.js';
import { SystemStorage } from './storage.js';
import { KegFileData } from './kegFile.js';

const sampleKegpath = path.resolve(__dirname, '../', 'testdata', 'samplekeg');

describe('common programming patterns', async () => {
	// test('should be able to read the keg config', () => {
	// 	const knut = Knut.load({
	// 		sample: { storage: new SystemStorage({ kegpath: sampleKegpath }) },
	// 	});
	// 	const keg = knut.getKeg('sample');
	// 	const dex = knut.getDex('sample');
	// 	expect(keg).toEqual(
	// 		expect.objectContaining<KegYamlData>({ title: '' }),
	// 	);
	// });
	test('should be able to list the nodes', async () => {
		const knut = Knut.load({
			sample: { storage: sampleKegpath },
		});
		const nodes = await knut.nodeList('sample');
		expect(nodes).toBe(expect.objectContaining([1, 2, 3]));
	});

	test('should be able to create a new node', () => {
		// const node = knut.nodeCreate({
		// 	kegpath: sampleKegpath,
		// 	content: `# Some title`,
		// });
		// const nodeList = knut.search(sampleKegpath);
		// expect(nodeList).contains(node.id);
	});

	// test('should be able to find the nearest keg', () => {
	// 	const knut = Knut.load({ [sampleKegpath]: {} });
	// });
	//
	// test('should be able read a node for a given node path', () => {
	// 	const knut = Knut.load({
	// 		[sampleKegpath]: {
	// 			storage: new SystemStorage({ kegpath: sampleKegpath }),
	// 		},
	// 	});
	//
	// 	const node = knut.nodeRead({ kegpath: sampleKegpath, nodeId: '2' });
	// 	expect(node.content).toEqual('# Some title for 2');
	// 	expect(node.title).toEqual('Some title for 2');
	// });
	//
	// test('should be able to find nodes with a specific tag', () => {
	// 	const knut = Knut.load({ [sampleKegpath]: {} });
	//
	// 	const list = knut.search(sampleKegpath, {
	// 		tags: { $eq: 'example' },
	// 	});
	// 	expect(list).includes(10);
	// 	expect(list).includes(12);
	// });
	//
	// test('should be able to share with some one', () => {
	// 	const knut = Knut.load({ [sampleKegpath]: {} });
	//
	// 	const link = knut.share({ kegpath: sampleKegpath, nodeId: '12' });
	// 	expect(link).toEqual('https://whatisthis.com');
	// });
});
