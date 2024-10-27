import { expect, test } from 'vitest';
import { TestUtils } from './Testing/index.js';
import { KegNode } from './KegNode.js';
import { Future, KegNodeAST, Result } from './Utils/index.js';

TestUtils.describeEachBackend('KegNode', async ({ loadStore: loadStorage }) => {
	test('should be able to create a new node', async () => {
		const storage = await loadStorage();
		const title = 'An example title';
		const summary = 'This is an example summary';
		const node = Result.unwrap(
			await KegNode.create({ storage, title, summary }),
		);
		const content = node.getContent();
		const example = KegNodeAST.create({ title, summary });
		expect(content).toStrictEqual(example.stringify());
		expect(Result.ok(content)).toStrictEqual(
			await storage.read('README.md'),
		);
	});

	test("should not be able to load a node that doesn't have content", async () => {
		const storage = await Future.map(loadStorage(), (s) =>
			s.child('docs/5'),
		);
		const errors = Result.unwrapErr(await KegNode.fromStorage(storage));
		expect(errors[0]).toStrictEqual(
			expect.objectContaining({
				filename: `${storage.pwd}/README.md`,
			}),
		);
		expect(errors[1]).toStrictEqual(
			expect.objectContaining({
				filename: `${storage.pwd}/meta.yaml`,
			}),
		);
	});
});
