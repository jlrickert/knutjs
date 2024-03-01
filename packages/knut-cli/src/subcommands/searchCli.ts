import { Command } from 'commander';
import { Knut, SearchStrategy } from '@jlrickert/knutjs-core/knut';
import {
	JSONOption,
	KegPathOption,
	KnutCommand,
	RawOption,
	YAMLOption,
	jsonOption,
	rawOption,
	yamlOption,
} from './knutCli.js';
import { terminal } from '../terminal.js';
import { pipe } from 'fp-ts/lib/function.js';

type SearchOptions = {
	pager?: boolean;
	tags?: string[];
	strategy?: SearchStrategy;
	kegpaths: string[];
	json?: boolean;
	yaml?: boolean;
	raw?: boolean;
	limit?: number;
};

export const search = async (query: string, options: SearchOptions) => {
	const knut = await Knut.create();
	const results = await knut.search({
		limit: options.limit,
		filter: {
			$text: { $search: query },
			content: { $query: query },
			tags: options.tags,
		},
	});

	results.sort((a, b) => {
		return b.rank - a.rank;
	});

	const message = options.raw ? JSON.stringify(results) : results;
	return await pipe(terminal.fmtLn(message));
};

export const searchCli = KnutCommand('search')
	.argument('[query]')
	.option('-t, --tag <tag...>', 'comma separated list of tags')
	.option('-l, --limit <limit>', 'limit of search results')
	.addOption(jsonOption)
	.addOption(rawOption)
	.addOption(yamlOption)
	.action(
		async (
			query: string,
			options: YAMLOption &
				JSONOption &
				KegPathOption &
				RawOption & { tag?: string[]; limit?: string },
			command: Command,
		) => {
			await search(query ?? '', {
				tags: options.tag,
				json: options.json,
				yaml: options.yaml,
				pager: false,
				kegpaths: options.kegpath ?? [],
				raw: options.raw,
				limit: options.limit ? parseInt(options.limit) : 10,
			});
		},
	);
