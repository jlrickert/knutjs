import { describe, expect, it } from 'vitest';
import { pipe } from 'fp-ts/lib/function.js';
import { testUtils } from '@jlrickert/knutjs-core/internal/testUtils';
import { future } from '@jlrickert/knutjs-core/internal/future';
import { optionalT } from '@jlrickert/knutjs-core/internal/optionalT';
import { Knut } from '@jlrickert/knutjs-core/knut';
import { KnutConfigFile } from '@jlrickert/knutjs-core/configFile';
import { terminal } from '../terminal.js';
import { cliBackend } from '../backend.js';
import { rootCli } from '../root.js';

const T = optionalT(future.Monad);

describe('kegCli', () => {
	const argvTable = [
		['node', 'knut', 'keg', 'init', '-k', 'sample', 'kegs/sample'],
		['node', 'knut', 'keg', 'init', 'kegs/sample', '-k', 'sample'],
	];
	for (const argv of argvTable) {
		it(`should be able to initiate a new keg with \`${argv
			.slice(2)
			.join(' ')}\``, async () => {
			const [output, input] = terminal.pipe();
			const context = cliBackend(
				await testUtils.testNodeBackend(),
				terminal.make({
					input,
					output,
				}),
			);

			const c = await rootCli(context);
			await c.parseAsync(argv);

			expect(
				await pipe(
					context.loader('kegs/sample'),
					T.chain((store) => store.read('keg')),
				),
			).toHaveLength(283);
			expect(
				await pipe(
					KnutConfigFile.fromStorage(context.variable),
					T.map((config) => config.data.kegs[0]),
				),
			).toStrictEqual({
				alias: 'sample',
				enabled: true,
				url: expect.stringContaining('kegs/sample'),
			});
		});
	}

	it('should get the currect directory path', async () => {
		const [output, input] = terminal.pipe();
		const context = cliBackend(
			await testUtils.testNodeBackend(),
			terminal.make({
				input,
				output,
			}),
		);
		const knut = await Knut.fromBackend(context);
		await knut.initKeg('sample', 'kegs/sample', { enabled: true });

		const c = await rootCli(context);
		await c.parseAsync([
			'node',
			'knut',
			'keg',
			'directory',
			'-k',
			'sample',
		]);

		const data = await terminal.readAll(context.terminal);
		expect(data).toEqual(expect.stringMatching(/sample$/));
	});
});
