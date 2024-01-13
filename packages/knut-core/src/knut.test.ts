import Path from 'path';
import { readFile } from 'fs/promises';
import { test, describe, expect } from 'vitest';
import { Knut } from './knut.js';
import { NodeId } from './node.js';
import { NodeContent } from './nodeContent.js';
import { sampleKegpath } from './internal/testUtils.js';

describe('common programming patterns', async () => {
	test('should be able to list all nodes', async () => {
		const knut = await Knut.load({
			sample: { storage: sampleKegpath },
		});
		const nodes = await knut.search({ kegalias: 'sample', limit: 0 });
		expect(nodes).toHaveLength(13);
		const nodeIds = nodes
			.map((n) => n.nodeId)
			.map(Number)
			.sort();
		expect(new Set(nodeIds)).toHaveLength(13);
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
		const nodeContent = await readFile(
			Path.join(sampleKegpath, NodeContent.filePath(new NodeId('0'))),
		);
		expect(node?.content.stringify()).toEqual(nodeContent.toString());
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
