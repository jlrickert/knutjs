import Path from 'path';
import { readFile, mkdtemp, rmdir } from 'fs/promises';
import { test, describe, expect, beforeAll, afterAll } from 'vitest';
import { Knut } from './knut.js';
import { NodeId } from './node.js';
import { NodeContent } from './nodeContent.js';
import { knutConfigPath, sampleKegpath } from './internal/testUtils.js';
import { KnutSystemStorage } from './knutStorage/systemStorage.js';
import { tmpdir } from 'os';

const cacheRoot = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
const sampleKnutStorage = new KnutSystemStorage({
	configRoot: knutConfigPath,
	dataRoot: knutConfigPath,
	cacheRoot: cacheRoot,
});

describe('common programming patterns', async () => {
	beforeAll(async () => {});

	afterAll(async () => {
		await rmdir(cacheRoot);
	});

	test('should be able to load keg file details from sample keg', async () => {
		const knut = await Knut.fromStorage(sampleKnutStorage);
		const kegFile = knut.getKegFile('sample');
		expect(kegFile?.getAuthor()).toEqual('git@github.com:YOU/YOU.git');
	});

	test('should be able to list all nodes', async () => {
		const knut = await Knut.fromStorage(sampleKnutStorage);
		const nodes = await knut.search({ limit: 0 });
		expect(nodes).toHaveLength(13);
		const nodeIds = nodes
			.map((n) => n.nodeId)
			.map(Number)
			.sort();
		expect(new Set(nodeIds)).toHaveLength(13);
	});

	test('should be able to read a node', async () => {
		const knut = await Knut.fromStorage(sampleKnutStorage);
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

	test('should be able to create a new node', () => {});
});
