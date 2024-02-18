import { describe, expect, test } from 'vitest';
import { SearchCliOptions, search, searchCli } from './searchCli.js';
import * as Path from 'path';
import { testingUtils } from './internal/testingUtils.js';
import { testUtils } from '@jlrickert/knutjs-core/internal/testUtils.js';

const configFilepath = Path.join(testUtils.knutConfigPath, 'config.yaml');

describe('search cli', () => {
	test('should parse', async () => {
		const mockAction = testingUtils.mockAction<string, SearchCliOptions>();
		const command = searchCli
			.action(mockAction)
			.parse([
				'knut',
				'search',
				'-c',
				configFilepath,
				'--kegpath',
				'sample',
				'-r',
				'lorem ipsum',
			]);
		const opts = command.opts<SearchCliOptions>();
		expect(command.args).toStrictEqual(['lorem ipsum']);
		expect(opts.raw).toEqual(true);
		expect(opts.kegpath).toStrictEqual(['sample']);
		expect(mockAction).toHaveBeenCalledWith('lorem ipsum', opts, command);
	});
});

describe('search', () => {
	test('should find lorem ipsum', async () => {
		const output = await testingUtils.captureOutput(async () => {
			await search('lorem ipsum', {
				kegpaths: [testUtils.sampleKegpath],
				config: Path.join(testUtils.knutConfigPath, 'config.yaml'),
			});
		});

		expect(output).toEqual('rawr');
	});
});
