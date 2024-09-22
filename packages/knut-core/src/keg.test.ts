import { afterEach, describe, expect, test, vi } from 'vitest';
import invariant from 'tiny-invariant';
import { Keg } from './Keg.js';
import { TestUtils } from './Testing/index.js';
import { KegConfig } from './KegConfig.js';
import { Result } from './Utils/index.js';
import { KegNode } from './KegNode.js';
import { NodeContent } from './Data/index.js';

TestUtils.describeEachBackend(
	'Keg',
	async ({ name, loadBackend, loadStorage }) => {
		afterEach(() => {
			global.localStorage.clear();
			vi.resetAllMocks();
		});

		describe('Keg.create', () => {
			test('should create a config file', async () => {
				const backend = await loadBackend();
				const storage = await loadStorage();

				const keg = await Keg.create({
					storage,
					backend,
					config: KegConfig.create({
						title: `Example keg title: ${name}`,
					}),
				});
				const kegConfig = Result.map(
					await KegConfig.fromStorage(storage),
					(a) => a.stringify(),
				);
				expect(await storage.read('keg')).toStrictEqual(kegConfig);
				invariant(Result.isOk(keg));
				expect(Result.ok(keg.value.config.stringify())).toStrictEqual(
					kegConfig,
				);
			});

			test('should create a zero node', async () => {
				const backend = await loadBackend();
				const storage = await loadStorage();
				const keg = await Keg.create({
					storage,
					backend,
					config: KegConfig.create({ title: 'Example keg title' }),
				});
				invariant(Result.isOk(keg));

				const expectedContent = Result.ok(
					NodeContent.fromContent({
						title: NodeContent.TEMPLATES.zero.title,
						summary: NodeContent.TEMPLATES.zero.summary,
					}).stringify(),
				);
				const zeroNodeStorage = storage.child(0);
				expect(
					Result.map(
						await KegNode.fromStorage(zeroNodeStorage),
						(a) => a.getContent(),
					),
				).toStrictEqual(expectedContent);
				expect(
					Result.map(await keg.value.getNode(0), (node) =>
						node.getContent(),
					),
				).toStrictEqual(expectedContent);
			});
		});

		// test('should be able to create a new node', async () => {
		// 	const backend = await loadBackend();
		// 	const storage = await backend.loader('testkeg');
		// 	invariant(
		// 		Optional.isSome(storage),
		// 		'Expect test backend to load as expected',
		// 	);
		// 	const keg = await Keg.init(storage);
		// 	invariant(Optional.isSome(keg));
		//
		// 	const nodeId = await keg.createNode();
		// 	const node = await pipe(
		// 		Future.of(nodeId),
		// 		T.chain((id) => keg.getNode(id)),
		// 	);
		//
		// 	expect(node).toBeInstanceOf(KegNode);
		// });
		//
		// test('should be able to edit a node', async () => {
		// 	const now = new Date('2023-03-23');
		// 	vi.useFakeTimers();
		// 	vi.setSystemTime(now);
		//
		// 	const backend = await loadBackend();
		// 	const storage = await backend.loader('testkeg2');
		// 	invariant(
		// 		Optional.isSome(storage),
		// 		'Expect test backend to load as expected',
		// 	);
		// 	const keg = await Keg.init(storage);
		// 	invariant(Optional.isSome(keg));
		// 	const id = 2;
		// 	await pipe(
		// 		KegNode.fromContent({ content: '# Sample node', updated: now }),
		// 		Future.chain((node) => keg.writeNode(new NodeId(id), node)),
		// 	);
		//
		// 	expect(
		// 		await pipe(
		// 			keg.getNode(new NodeId(id)),
		// 			T.map((node) => ({
		// 				content: node.content,
		// 				updated: node.updated,
		// 			})),
		// 		),
		// 	).toStrictEqual({ content: '# Sample node\n', updated: now });
		// });
	},
);
