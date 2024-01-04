import { Command, Option } from 'commander';
import { search, share, version } from './index.js';

type KegPathOption = { kegpath?: string };
const kegpathOption = new Option('-kp, --kegpath <kegpath>', 'Keg to use');

type JSONOption = { json?: string };
const jsonOption = new Option('--json', 'Output as json').conflicts('json');

type YAMLOption = { yaml?: string };
const yamlOption = new Option('--yaml', 'Output as yaml').conflicts('yaml');

/**
 * Create a keg command. This add
 */
const KegCommand = (name: string): Command => {
	return new Command(name).passThroughOptions().addOption(kegpathOption);
};

const log = (cmd: string, message?: string) => {
	console.log(`Running ${cmd}: ${message ?? ''}`);
};

export const knutCli = new Command('knut')
	.version(version)
	.addOption(kegpathOption)
	.enablePositionalOptions(true);

export const searchCli = KegCommand('search')
	.argument('[query]')
	.option('-t, --tag <tag>', 'comma separated list of tags')
	.addOption(jsonOption)
	.addOption(yamlOption)
	.action(
		(
			query: string,
			options: YAMLOption & JSONOption & KegPathOption & { tag?: string },
			command: Command,
		) => {
			const tags: string[] = options.tag ? options.tag.split(',') : [];
			search(query ?? '', { tags });
			// console.log({
			// 	message: `Running search`,
			// 	query,
			// 	options,
			// 	parentOptions: command.parent?.opts(),
			// });
		},
	);
knutCli.addCommand(searchCli);

const kegCli = KegCommand('keg').addCommand(
	new Command('directory').action((options, parent: Command) => {
		console.log({ message: 'ok', options, parent: parent });
	}),
);
knutCli.addCommand(kegCli);

const nodeCli = KegCommand('node')
	.addOption(kegpathOption)
	.addCommand(
		new Command('list').action((a, b) => {
			console.log({ a, b });
		}),
	)
	.addCommand(new Command('last'));
knutCli.addCommand(nodeCli);

export const indexCli = KegCommand('index')
	.action((options, command: Command) => {
		console.log({ options, parent: command.parent?.opts() });
		log('index');
	})
	.addHelpText('beforeAll', 'update index')
	.enablePositionalOptions(true)
	.passThroughOptions(true)
	.addCommand(
		new Command('update')
			.enablePositionalOptions(true)
			.passThroughOptions(true)
			.action((options, command: Command) => {
				console.log({
					options,
					root: command.parent?.parent?.opts(),
					parent: command.parent?.opts(),
				});
			}),
	);
knutCli.addCommand(indexCli);

const shareCli = KegCommand('share')
	.argument('<node_id>')
	.addHelpText('before', 'Shares a node on s3 and provides a temporary link')
	.action((nodeId, options) => {
		share(nodeId, options);
	});
knutCli.addCommand(shareCli);
