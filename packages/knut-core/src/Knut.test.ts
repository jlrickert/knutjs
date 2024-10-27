import { test, expect, afterEach } from 'vitest';
import { Result } from './Utils/index.js';
import { TestUtils } from './Testing/index.js';
import { Keg } from './Keg.js';
import { Knut } from './Knut.js';
import { KegError } from './Data/index.js';

afterEach(() => {
	global.localStorage.clear();
});

TestUtils.describeEachBackend('Knut', async ({ loadBackend }) => {
	test('should to load the existing kegs', async () => {
		const backend = await loadBackend();
		const knut = Knut.fromBackend(backend);
		for (const alias of TestUtils.kegAliasFixtures) {
			const keg = Result.unwrap(await knut.getKeg(alias));
			expect(keg).toBeInstanceOf(Keg);
			const storage = Result.unwrap(await backend.loader(alias));
			expect(keg.getURI()).toStrictEqual(storage.uri);
		}
	});

	test('should get an error loading an uknown keg', async () => {
		const backend = await loadBackend();
		const knut = Knut.fromBackend(backend);
		expect(await knut.getKeg('dummykeg')).toEqual(
			Result.err(
				expect.objectContaining({
					message: expect.stringContaining('dummykeg'),
				}),
			),
		);
	});

	test('should be able to list all nodes', async () => {
		const backend = await loadBackend();
		const knut = Knut.fromBackend(backend);
	});
});

// for await (const { name, getBackend } of testUtils.backends) {
// 	describe(`${name} backend - common programming patterns`, async () => {
// 		afterEach(() => {
// 			global.localStorage.clear();
// 		});
// 		test('should be able to load keg file details from sample keg', async () => {
// 			const backend = await getBackend();
// 			const knut = await Knut.fromBackend(backend);
// 			const keg = knut.getKeg('sample1');
// 			expect(keg!.kegFile?.getAuthor()).toEqual(
// 				'git@github.com:YOU/YOU.git',
// 			);
// 		});
//
// 		test('should be able to list all nodes', async () => {
// 			const backend = await getBackend();
// 			const knut = await Knut.fromBackend(backend);
// 			const nodes = await collectAsync(knut.getNodeList());
// 			expect(nodes).toHaveLength(39);
// 		});
//
// 		test('should be able to read a node', async () => {
// 			const backend = await getBackend();
// 			const knut = await Knut.fromBackend(backend);
//
// 			const keg = knut.getKeg('sample1');
// 			const nodeId = new NodeId(0);
// 			const node = await keg!.getNode(nodeId);
// 			expect(node?.title).toEqual('Sorry, planned but not yet available');
// 			const nodeContent = await keg?.storage.read(
// 				NodeContent.filePath(nodeId),
// 			);
// 			expect(node!.content).toEqual(nodeContent);
// 		});
//
// 		test('should be able to create a node on a specific keg', async () => {
// 			const now = new Date();
// 			vi.useFakeTimers({ now });
//
// 			const backend = await getBackend();
// 			const knut = await Knut.fromBackend(backend);
//
// 			const keg = knut.getKeg('sample1');
// 			const nodeId = await keg?.createNode();
// 			const node = await keg?.getNode(nodeId!);
// 			expect(node?.title).toEqual('');
// 			expect(node?.updated).toStrictEqual(now);
// 		});
//
// 		test('should be able to search through nodes', async () => {
// 			const backend = await getBackend();
// 			const knut = await Knut.fromBackend(backend);
//
// 			const results = await knut.search({
// 				limit: 5,
// 				filter: { $text: { $search: 'lorem ipsum' } },
// 			});
// 			const topResult = results[0];
// 			expect(results.length).toBeLessThanOrEqual(5);
// 			expect(topResult.kegalias).toEqual('sample1');
// 			expect(topResult.nodeId).toEqual('7');
// 		});
//
// 		test('should be able to create a new keg', async () => {
// 			const backend = await getBackend();
// 			const knut = await Knut.fromBackend(backend);
// 			await knut.initKeg('sample', 'kegs/sample');
//
// 			{
// 				const storage = await backend.loader('kegs/sample');
// 				expect(await storage?.read('keg')).toStrictEqual(
// 					expect.stringContaining('yaml-language-server'),
// 				);
// 			}
//
// 			const config = await KnutConfigFile.fromStorage(backend.variable);
// 			expect(config?.data.kegs[0]).toStrictEqual({
// 				alias: 'sample',
// 				enabled: true,
// 				url: expect.stringContaining('kegs/sample'),
// 			});
//
// 			const storage = await backend.loader(config?.data.kegs[0].url!);
// 			expect(await storage?.read('keg')).toStrictEqual(
// 				expect.stringContaining('yaml-language-server'),
// 			);
//
// 			const T = optionalT(Future.Monad);
// 			expect(
// 				await pipe(
// 					Knut.fromBackend(backend),
// 					T.chain((knut) => Future.of(knut.getKeg('sample'))),
// 				),
// 			).toBeTruthy();
// 		});
// 	});
// }
