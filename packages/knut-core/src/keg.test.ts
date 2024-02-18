import invariant from 'tiny-invariant';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { pipe } from 'fp-ts/lib/function.js';
import { collectAsync, stringify } from './utils.js';
import { MemoryStorage } from './storage/memoryStorage.js';
import { Keg } from './keg.js';
import { KegFile } from './kegFile.js';
import { KegNode } from './node.js';
import { testUtilsM } from './internal/testUtils.js';
import { envStorageM } from './envStorage.js';
import { optional } from './internal/optional.js';

describe('keg', () => {
	afterEach(async () => {
		vi.useRealTimers();
	});

	test('should be able to create a new empty keg', async () => {
		vi.useFakeTimers();
		const now = new Date();
		vi.setSystemTime(now);
		const rootStorage = MemoryStorage.create();
		const env = envStorageM.memoryEnv();
		const storage = rootStorage.child('testkeg');
		const keg = await Keg.fromStorage(storage, env);
		invariant(optional.isSome(keg));
		expect(stringify(keg.kegFile)).toEqual(stringify(KegFile.create()));
		expect(await collectAsync(keg.getNodeList())).toHaveLength(1);
		expect(await rootStorage.read('testkeg/0/README.md')).toEqual(
			(await KegNode.zeroNode()).content,
		);
	});

	test('should be able to search for lorem ipsum node', async () => {
		const keg = await testUtilsM.createTestKeg();
		const results = await keg.search({
			name: 'fuse',
			filter: { $text: { $search: 'lorem ipsum' } },
		});
		const result = results[0].nodeId;

		// 7 is the node id that contains content with lorem ipsum
		expect(result).toEqual('7');
	});

	test('should be able to create a node', async () => {
		const keg = await testUtilsM.createTestKeg();
		const prevCount = pipe(
			await collectAsync(keg.storage.listNodes()),
			(a) => a.length,
		);
		const nodeId = await keg.createNode();
		const count = pipe(
			await collectAsync(keg.storage.listNodes()),
			(a) => a.length,
		);
		expect(count - prevCount).toEqual(1);
		const node = await keg.getNode(nodeId);
		const now = new Date();
		expect(node).toBeTruthy();
		invariant(
			node,
			'Expect test case above to fail if node cannot be found',
		);

		const updatedDelta =
			new Date(node.updated).getUTCDate() - now.getUTCDate();
		const createdDelta =
			new Date(node.created).getUTCDate() - now.getUTCDate();
		expect(updatedDelta).toBeLessThanOrEqual(5);
		expect(createdDelta).toBeLessThanOrEqual(5);
		expect(node.title).toEqual('');
	});

	test('should load dex', async () => {
		const keg = await testUtilsM.createTestKeg();
		expect(keg.dex.entries).matchSnapshot('dex entries');
	});
});
