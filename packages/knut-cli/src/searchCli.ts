import { Command } from 'commander';
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
import { search } from './internal/search.js';

export const searchCli = KnutCommand('search')
	.argument('[query]')
	.option('-t, --tag <tag...>', 'comma separated list of tags')
	.addOption(jsonOption)
	.addOption(rawOption)
	.addOption(yamlOption)
	.action(
		async (
			query: string,
			options: YAMLOption &
				JSONOption &
				KegPathOption &
				RawOption & { tag?: string[] },
			command: Command,
		) => {
			await search(query ?? '', {
				tags: options.tag,
				json: options.json,
				yaml: options.yaml,
				pager: false,
				kegpaths: options.kegpath ?? [],
				raw: options.raw,
			});
		},
	);
