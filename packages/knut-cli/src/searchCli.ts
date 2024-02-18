import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from 'commander';
import { Knut, SearchStrategy } from '@jlrickert/knutjs-core/knut.js';
import { KnutCommand, jsonOption, rawOption, yamlOption } from './knutCli.js';
import { KnutConfigFile } from '@jlrickert/knutjs-core/configFile.js';

type SearchOptions = {
	pager?: boolean;
	tags?: string[];
	strategy?: SearchStrategy;
	kegpaths: string[];
	json?: boolean;
	yaml?: boolean;
	raw?: boolean;
	limit?: number;
	config?: string;
};

export const search = async (query: string, options: SearchOptions) => {
	const knut = await Knut.create();
	const results = await knut.search({
		name: 'fuse',
		limit: options.limit,
		filter: {
			$text: { $search: query },
		},
	});

	results.sort((a, b) => {
		return b.rank - a.rank;
	});

	if (options.raw) {
		console.log(JSON.stringify(results));
	} else {
		console.log(results);
	}
};

export type SearchCliOptions = {
	raw?: boolean;
	tag?: string[];
	limit?: number;
	config?: string;
	kegpath?: string[];
	json?: boolean;
	yaml?: boolean;
};
export const searchCli = KnutCommand('search')
	.option('-t, --tag <tag...>', 'comma separated list of tags')
	.option('-l, --limit <limit>', 'limit of search results', Number)
	.argument('[query]')
	.addOption(jsonOption)
	.addOption(rawOption)
	.addOption(yamlOption)
	.action(
		async (query: string, options: SearchCliOptions, command: Command) => {
			const limit = options.limit ?? 10;
			await search(query ?? '', {
				tags: options.tag,
				json: options.json,
				yaml: options.yaml,
				pager: false,
				kegpaths: options.kegpath ?? [],
				raw: options.raw,
				limit: limit < 0 ? 0 : limit,
			});
		},
	);
