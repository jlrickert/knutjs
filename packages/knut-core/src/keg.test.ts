import { pipe } from 'fp-ts/lib/function.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import invariant from 'tiny-invariant';
import { testUtils } from './internal/testUtils.js';
import { optional } from './internal/optional.js';
import { future } from './internal/future.js';
import { optionalT } from './internal/optionalT.js';
import { Keg } from './keg.js';
import { stringify } from './utils.js';
import { KegNode, NodeId } from './node.js';

const T = optionalT(future.Monad);

for await (const { name, getBackend } of testUtils.backends) {
	describe(`${name} - keg`, async () => {
		afterEach(() => {
			global.localStorage.clear();
			vi.resetAllMocks();
		});

		it('should be able to create a new keg', async () => {
			const backend = await getBackend();
			const storage = await backend.loader('testkeg');
			invariant(
				optional.isSome(storage),
				'Expect test backend to load as expected',
			);
			const keg = await Keg.init(storage);
			invariant(optional.isSome(keg));

			const kegFileContent = await storage.read('keg');
			expect(kegFileContent).toEqual(stringify(keg?.kegFile));

			const node = await keg.getNode(new NodeId(0));
			const zeroNode = await KegNode.zeroNode();
			expect(node?.content).toEqual(zeroNode.content);
		});

		it('should be able to create a new node', async () => {
			const backend = await getBackend();
			const storage = await backend.loader('testkeg');
			invariant(
				optional.isSome(storage),
				'Expect test backend to load as expected',
			);
			const keg = await Keg.init(storage);
			invariant(optional.isSome(keg));

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

			const backend = await getBackend();
			const storage = await backend.loader('testkeg2');
			invariant(
				optional.isSome(storage),
				'Expect test backend to load as expected',
			);
			const keg = await Keg.init(storage);
			invariant(optional.isSome(keg));
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
	});
}
