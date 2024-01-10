import Path from 'path';
import { test, describe, expect } from 'vitest';
import { Knut } from './knut.js';
import { NodeId } from './node.js';

const sampleKegpath = Path.resolve(__dirname, '..', 'testdata', 'samplekeg');

describe('common programming patterns', async () => {
	test('should be able to list the nodes', async () => {
		const knut = await Knut.load({
			sample: { storage: sampleKegpath },
		});
		const nodes = await knut.search('sample');
		const nodeIds = nodes
			.map((n) => n.nodeId)
			.map(Number)
			.sort()
			.map(String);
		const expected = Array(13)
			.fill(1)
			.map((_, i) => i)
			.sort()
			.map(String);
		expect(nodeIds).toStrictEqual(expected);
	});

	test('should be able to read a node', async () => {
		const knut = await Knut.load({
			sample: { storage: sampleKegpath },
		});
		const node = await knut.nodeRead({
			kegalias: 'sample',
			nodeId: new NodeId('0'),
		});
		expect(node?.title).toEqual('Sorry, planned but not yet available');
		expect(node?.content.stringify()).toEqual(
			`
# Sorry, planned but not yet available

This is a filler until I can provide someone better for the link that brought
you here. If you are really anxious, consider opening an issue describing why
you would like this missing content created before the rest.
`.trimStart(),
		);
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
