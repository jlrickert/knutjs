import { pipe } from 'fp-ts/lib/function.js';
import { describe, expect, it } from 'vitest';
import { testUtils } from '@jlrickert/knutjs-core/internal/testUtils';
import { terminal } from '../terminal.js';
import { searchCli } from './searchCli.js';
import { cliBackend } from '../backend.js';

describe('searchCli', () => {
	it('should be able to search', async () => {
		const [output, input] = terminal.pipe();
		const backend = cliBackend({
			...(await testUtils.testNodeBackend()),
			input,
			output,
		});

		const c = await searchCli(backend).parseAsync([
			'knut',
			'search',
			'-r',
			'home',
		]);

		const data = terminal.readAll(output);

		expect(c.args).toStrictEqual(['home']);
		expect(c.opts()).toStrictEqual({ json: true, raw: true });
		expect(JSON.parse(await data)).toHaveLength(10);
		expect(JSON.parse(await data)[0]).toStrictEqual(
			expect.objectContaining({
				author: 'git@github.com:YOU/YOU.git',
			}),
		);
	});
});
