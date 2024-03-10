import { pipe } from 'fp-ts/lib/function.js';
import { Command } from 'commander';
import { Knut, SearchStrategy } from '@jlrickert/knutjs-core/knut';
import {
	JSONOption,
	KegAliasOption,
	KnutCommand,
	RawOption,
	YAMLOption,
	jsonOption,
	rawOption,
	yamlOption,
} from '../knut.js';
import { terminal } from '../terminal.js';
import { Backend } from '../backend.js';
import { Cmd, command } from '../command.js';

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

export const search =
	(query: string, options: SearchOptions) => async (backend: Backend) => {
		const knut = await Knut.fromBackend(backend);
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

		terminal.fmtLn(options.raw ? JSON.stringify(results) : results)(
			backend.terminal,
		);
	};

export const searchCli: Cmd = pipe(
	command.context,
	command.map(() => KnutCommand('search')),
	command.map((c) => c.argument('[query]')),
	command.map((c) =>
		c.option('-t, --tag <tag...>', 'comma separated list of tags'),
	),
	command.map((c) =>
		c.option('-l, --limit <limit>', 'limit of search results', Number),
	),
	command.map((c) => c.addOption(jsonOption)),
	command.map((c) => c.addOption(rawOption)),
	command.map((c) => c.addOption(yamlOption)),
	command.chain(
		(c) => (backend) =>
			c.action(
				async (
					query: string,
					options: YAMLOption &
						JSONOption &
						KegAliasOption &
						RawOption & { tag?: string[]; limit?: string },
					command: Command,
				) => {
					await search(query ?? '', {
						tags: options.tag,
						json: options.json,
						yaml: options.yaml,
						pager: false,
						kegpaths: options.aliases ?? [],
						raw: options.raw,
						limit: options.limit ? parseInt(options.limit) : 10,
					})(backend);
				},
			),
	),
);
