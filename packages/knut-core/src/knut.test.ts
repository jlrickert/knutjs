import Path from 'path';
import { test, describe, expect, beforeEach, afterEach } from 'vitest';
import { NodeId } from './node.js';
import { NodeContent } from './nodeContent.js';
import {
	TestDataKnutApp,
	createSampleKnutApp,
	sampleKegpath,
} from './internal/testUtils.js';

describe('common programming patterns', async () => {
	let ctx!: TestDataKnutApp;

	beforeEach(async () => {
		ctx = await createSampleKnutApp();
	});

	afterEach(async () => {
		await ctx.reset();
	});

	test('should be able to load keg file details from sample keg', async () => {
		const keg = ctx.knut.getKeg('sample');
		console.log({ keg });
		expect(keg?.kegFile?.getAuthor()).toEqual('git@github.com:YOU/YOU.git');
	});

	test('should be able to list all nodes', async () => {
		const nodes = await ctx.knut.search({ limit: 0 });
		expect(nodes).toHaveLength(13);
		const nodeIds = nodes
			.map((n) => n.nodeId)
			.map(Number)
			.sort();
		expect(new Set(nodeIds)).toHaveLength(13);
	});

	// test('should be able to merge 2 kegs', async () => {
	// 	const knut = await Knut.fromConfig(
	// 		{ kegs: [{ alias: 'sample', url: sampleKegpath }] },
	// 		loadStorage(await getCacheDir()),
	// 	);
	// 	const exampleStorage = KegStorage.fromStorage(MemoryStorage.create());
	// 	await knut.loadKeg('example', { storage: exampleStorage });
	// 	await knut.merge(['sample'], 'example');
	// 	expect(await exampleStorage.listNodes()).toHaveLength(13);
	//
	// 	const node = knut.createNode({ nodeId, kegalias, meta, content });
	// });

	test('should be able to read a node', async () => {
		const node = await ctx.knut.getNode({
			kegalias: 'sample',
			nodeId: new NodeId(0),
		});
		expect(node?.title).toEqual('Sorry, planned but not yet available');
		const nodeContent = await ctx.storage.read(
			Path.join(sampleKegpath, NodeContent.filePath(new NodeId(0))),
		);
		console.log({ nodeContent });
		expect(node?.content.stringify()).toEqual(nodeContent?.toString());
	});

	// test('should be able to create a new node', () => {});
});
