import { Knut } from '@jlrickert/knutjs-core/knut';
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

export const search = async (
	query: string,
	options: YAMLOption &
		JSONOption &
		KegPathOption &
		RawOption & { tag?: string[]; limit?: string },
): Promise<void> => {
	const knut = await Knut.fromStorage();
	const results = await knut.search({
		limit: Number(options.limit),
		strategy: 'classic',
		filter: {
			$text: { $search: query },
			tags: options.tag,
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

export const searchCli = KnutCommand('search')
	.argument('[query]')
	.option('-t, --tag <tag...>', 'comma separated list of tags')
	.option('-l, --limit <limit>', 'limit of search results')
	.addOption(jsonOption)
	.addOption(rawOption)
	.addOption(yamlOption)
	.action(search);
