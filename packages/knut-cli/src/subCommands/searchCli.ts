import { pipe } from 'fp-ts/lib/function.js';
import { Knut, SearchStrategy } from '@jlrickert/knutjs-core/knut';
import { jsonOption, rawOption, yamlOption } from '../knut.js';
import { terminal } from '../terminal.js';
import { Backend } from '../backend.js';
import { Action, Cmd, cmd } from '../command.js';

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

export const search: Backend<Action<string, SearchOptions>> = cmd.action(
	(query, options) => async (ctx) => {
		const knut = await Knut.fromBackend(ctx);
		const results = await knut.search({
			limit: options.limit ?? 10,
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
			ctx.terminal,
		);
	},
);

export const searchCli: Cmd = pipe(
	cmd.make('search'),
	cmd.argument('[query]', 'Queary all kegs'),
	cmd.option('-t, --tag <tag...>', 'comma separated list of tags'),
	cmd.parseOption('-l, --limit <limit>', 'limit of search results', Number),
	cmd.addOption(jsonOption),
	cmd.addOption(rawOption),
	cmd.addOption(yamlOption),
	cmd.addAction(search),
);
