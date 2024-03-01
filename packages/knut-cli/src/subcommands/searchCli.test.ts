import { pipe } from 'fp-ts/lib/function.js';
import { TestContext } from '@jlrickert/knutjs-core/internal/testUtils';
import { platform } from '@jlrickert/knutjs-core/platform';
import { describe, expect, it } from 'vitest';
import { searchCli } from './searchCli.js';
import { terminal } from '../terminal.js';

describe('searchCli', () => {
	it('should be able to search', async () => {
		const context = await TestContext.nodeContext();
		expect(1 + 2).toEqual(3);
		const [r, w] = terminal.pipe();

		const run = pipe(
			() => searchCli.parseAsync(['knut', 'search', '-r', 'home']),
			terminal.withOutput(w),
		);

		const c = await run();

		let data = '';
		r.on('data', (chunk) => {
			data = data + chunk;
		});

		expect(c.args).toStrictEqual(['home']);
		expect(c.opts()).toStrictEqual({ json: true, raw: true });
	});
});
