import { pipe } from 'fp-ts/lib/function.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import invariant from 'tiny-invariant';
import { TestUtils } from './internal/testUtils.js';
import { future } from './internal/future.js';
import { optionalT } from './internal/optionalT.js';
import { Keg } from './keg.js';
import { deepCopy, stringify } from './utils.js';
import { KegNode, NodeId } from './KegNode.js';
import { DexEntry } from './Dex.js';
import { KegConfig } from './KegConfig.js';
import { Optional } from './internal/index.js';

const T = optionalT(future.Monad);

TestUtils.describeEachBackend('Keg', async ({ name, loadBackend }) => {
	afterEach(() => {
		global.localStorage.clear();
		vi.resetAllMocks();
	});

	it('should be able to create a new keg', async () => {
		const backend = await loadBackend();
		const storage = await backend.loader('testkeg');
		invariant(
			Optional.isSome(storage),
			'Expect test backend to load as expected',
		);
		const keg = await Keg.createNew(storage);
		invariant(Optional.isSome(keg));

		const kegFileContent = await storage.read('keg');
		expect(kegFileContent).toEqual(stringify(keg?.config));

		const node = await keg.getNode(new NodeId(0));
		const zeroNode = await KegNode.zeroNode();
		expect(node?.content).toEqual(zeroNode.content);
	});

	it('should be able to create a new node', async () => {
		const backend = await loadBackend();
		const storage = await backend.loader('testkeg');
		invariant(
			Optional.isSome(storage),
			'Expect test backend to load as expected',
		);
		const keg = await Keg.createNew(storage);
		invariant(Optional.isSome(keg));

		const nodeId = await keg.createNode();
		const node = await pipe(
			future.of(nodeId),
			T.chain((id) => keg.getNode(id)),
		);

		expect(node).toBeInstanceOf(KegNode);
	});

	it('should be able to edit a node', async () => {
		const now = new Date('2023-03-23');
		vi.useFakeTimers();
		vi.setSystemTime(now);

		const backend = await loadBackend();
		const storage = await backend.loader('testkeg2');
		invariant(
			Optional.isSome(storage),
			'Expect test backend to load as expected',
		);
		const keg = await Keg.createNew(storage);
		invariant(Optional.isSome(keg));
		const id = 2;
		await pipe(
			KegNode.fromContent({ content: '# Sample node', updated: now }),
			future.chain((node) => keg.writeNode(new NodeId(id), node)),
		);

		expect(
			await pipe(
				keg.getNode(new NodeId(id)),
				T.map((node) => ({
					content: node.content,
					updated: node.updated,
				})),
			),
		).toStrictEqual({ content: '# Sample node\n', updated: now });
	});

	describe(`${name} - keg indexing`, async () => {
		afterEach(() => {
			global.localStorage.clear();
			vi.resetAllMocks();
		});

		it('should be able to rebuild the dex index', async () => {
			const backend = await loadBackend();
			const storage = await backend.loader('testkeg');
			invariant(
				Optional.isSome(storage),
				'Expect test backend to load as expected',
			);

			const now = new Date('2023-03-23');
			vi.useFakeTimers();
			vi.setSystemTime(now);

			const keg = await Keg.createNew(storage);
			invariant(Optional.isSome(keg));

			const zeroNode = await KegNode.zeroNode();
			expect(keg.dex.entries).toHaveLength(1);
			expect(keg.dex.entries).toStrictEqual([
				expect.objectContaining<Partial<DexEntry>>({
					title: zeroNode.title,
					updated: now,
				}),
			]);
			const nodeId = await keg.createNode();
			invariant(Optional.isSome(nodeId));

			const later = new Date(new Date(now).setMinutes(30));
			vi.setSystemTime(later);

			const content = '# New node\nExample summary';
			await keg.writeNodeContent(nodeId, {
				content,
			});

			expect(keg.dex.entries).toHaveLength(2);
			expect(keg.dex.entries).toStrictEqual([
				expect.objectContaining({
					title: zeroNode.title,
					updated: now,
				}),
				expect.objectContaining({
					title: 'New node',
					updated: later,
				}),
			]);

			expect(await storage.read('dex/nodes.tsv')).matchSnapshot();
		});

		it('should create a daily.md with valid date plugin config', async () => {
			const backend = await loadBackend();
			const storage = await backend.loader('testkeg');
			invariant(
				Optional.isSome(storage),
				'Expect test backend to load as expected',
			);

			const now = new Date('2023-03-23');
			vi.useFakeTimers();
			vi.setSystemTime(now);

			const keg = await Keg.createNew(storage);
			invariant(Optional.isSome(keg));

			const config = new KegConfig(deepCopy(keg.config.data));
			config.mergeData({
				indexes: [
					{
						plugin: 'date',
						file: 'dex/daily.md',
						args: { tags: 'daily' },
						summary: 'Daily index',
					},
				],
			});
			await keg.reloadConfig(config);
			invariant(Optional.isSome(keg));

			const [a, b, c, d, e] = await Promise.all([
				keg.createNode(),
				keg.createNode(),
				keg.createNode(),
				keg.createNode(),
				keg.createNode(),
			]);
			invariant(Optional.isSome(a));
			invariant(Optional.isSome(b));
			invariant(Optional.isSome(c));
			invariant(Optional.isSome(d));
			invariant(Optional.isSome(e));

			await keg.writeNodeContent(a, {
				content: '# Node A',
			});
			await keg.writeNodeContent(b, {
				content: '# Node B',
				meta: { tags: ['daily'], date: stringify(now) },
			});
			await keg.writeNodeContent(c, {
				content: '# Node C',
				meta: { date: stringify(now) },
			});
			await keg.writeNodeContent(d, {
				content: '# Node D',
				meta: { tags: ['daily'] },
			});
			await keg.writeNodeContent(e, {
				content: '# Node E',
				meta: { tags: ['other'] },
			});

			expect(await keg.storage.read('dex/daily.md')).matchSnapshot();
		});
	});
});
