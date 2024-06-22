import { pipe } from 'fp-ts/lib/function.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import invariant from 'tiny-invariant';
import { testUtils } from './internal/testUtils.js';
import { Keg } from './keg.js';
import { KegNode, NodeId } from './node.js';
import { Future, Optional, optionalT, stringify } from './Utils/index.js';

const T = optionalT(Future.Monad);

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
				Optional.isSome(storage),
				'Expect test backend to load as expected',
			);
			const keg = await Keg.init(storage);
			invariant(Optional.isSome(keg));

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
				Optional.isSome(storage),
				'Expect test backend to load as expected',
			);
			const keg = await Keg.init(storage);
			invariant(Optional.isSome(keg));

			const nodeId = await keg.createNode();
			const node = await pipe(
				Future.of(nodeId),
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
				Optional.isSome(storage),
				'Expect test backend to load as expected',
			);
			const keg = await Keg.init(storage);
			invariant(Optional.isSome(keg));
			const id = 2;
			await pipe(
				KegNode.fromContent({ content: '# Sample node', updated: now }),
				Future.chain((node) => keg.writeNode(new NodeId(id), node)),
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
