import { describe, expect, test } from 'vitest';
import { TestUtils } from '../Testing/index.js';
import { Result } from './index.js';
import { Yaml, YamlError } from '../Data/index.js';

describe.concurrent('Yaml', () => {
	describe('parse', () => {
		test('should parse yaml content', async () => {
			const data = Result.unwrap(
				await TestUtils.fixtures.read('kegs/samplekeg1/keg'),
			);
			const result = Yaml.parse(data);
			expect(result).toStrictEqual(
				Result.ok({
					updated: '2022-11-26 19:33:24Z',
					kegv: '2023-01',
					title: 'A Sample Keg number 1',
					url: 'git@github.com:YOU/keg.git',
					creator: 'git@github.com:YOU/YOU.git',
					state: 'living',
					summary:
						'👋 Hey there! The KEG community welcomes you. This is an initial\nsample `keg` file. It uses a simplified YAML format. (If you know JSON,\nyou know this.) Go ahead and change this summary and anything else you\nlike, but keep in mind the following:\n\n* The updated line MUST be the first line\n* Everything *but* the updated line is optional\n* You can leave the indexes section alone (they are on by default)\n* Change **creator** to the URL for your main keg\n* Change the **url** to the main place to find this keg\n* Change **state** only if you are planning something more formal\n* Keep the **zero node** created to link to for planned content\n\nIf you are a `vim` user you might want to add something like the\nfollowing to your `.vimrc`:\n\n  au bufnewfile,bufRead keg set ft=yaml\n',
					indexes: [
						{
							file: 'dex/changes.md',
							summary: 'latest changes',
						},
						{
							file: 'dex/nodes.tsv',
							summary: 'all nodes by id',
						},
						{
							file: 'dex/tags',
							summary: 'tags index',
						},
					],
				}),
			);
		});
	});
	test('should throw an error on invalid', () => {
		const result = Yaml.parse(
			`
example:
asdf
  this is a long
  string
		`.trim(),
		);
		expect(result).toEqual(
			Result.err(
				expect.objectContaining<Partial<YamlError.YamlParseError>>({
					code: 'PARSE_ERR',
				}),
			),
		);
	});
});
