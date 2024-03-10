import { describe, expect, it } from 'vitest';
import { testUtils } from '@jlrickert/knutjs-core/internal/testUtils';
import { terminal } from '../terminal.js';
import { cliBackend } from '../backend.js';
import { rootCli } from '../root.js';

describe('searchCli', () => {
	it('should be able to search with a basic query', async () => {
		const [output, input] = terminal.pipe();
		const backend = cliBackend({
			...(await testUtils.testNodeBackend()),
			input,
			output,
		});

		await rootCli(backend).parseAsync([
			'node',
			'knut',
			'search',
			'-r',
			'home',
		]);

		const data = terminal.readAll(output);

		expect(JSON.parse(await data)).toHaveLength(10);
		expect(JSON.parse(await data)[0]).toStrictEqual(
			expect.objectContaining({
				author: 'git@github.com:YOU/YOU.git',
			}),
		);
	});

	it('should be able to search with a basic query with a set limit if queries', async () => {
		const [output, input] = terminal.pipe();
		const backend = cliBackend({
			...(await testUtils.testNodeBackend()),
			input,
			output,
		});

		await rootCli(backend).parseAsync([
			'node',
			'knut',
			'search',
			'-r',
			'-l',
			'5',
			'home',
		]);

		const data = terminal.readAll(output);

		expect(JSON.parse(await data)).toHaveLength(5);
		expect(JSON.parse(await data)[0]).toStrictEqual(
			expect.objectContaining({
				author: 'git@github.com:YOU/YOU.git',
			}),
		);
	});
});
