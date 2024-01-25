import { configCli } from './configCli.js';
import { share } from './index.js';
import { kegCli } from './kegCli.js';
import { KnutCommand, knutCli } from './knutCli.js';
import { searchCli } from './searchCli.js';
import { updateCli } from './updateCli.js';

knutCli.addCommand(searchCli);
knutCli.addCommand(kegCli);
knutCli.addCommand(updateCli);

// const kegCli = KegCommand('keg').addCommand(
// 	new Command('directory').action((options, parent: Command) => {
// 		console.log({ message: 'ok', options, parent: parent });
// 	}),
// );
// knutCli.addCommand(kegCli);

// const nodeCli = KegCommand('node')
// 	.addOption(kegpathOption)
// 	.addCommand(
// 		new Command('list').action((a, b) => {
// 			console.log({ a, b });
// 		}),
// 	)
// 	.addCommand(new Command('last'));
// knutCli.addCommand(nodeCli);

// export const indexCli = KegCommand('index')
// 	.action((options, command: Command) => {
// 		console.log({ options, parent: command.parent?.opts() });
// 		log('index');
// 	})
// 	.addHelpText('beforeAll', 'update index')
// 	.enablePositionalOptions(true)
// 	.passThroughOptions(true)
// 	.addCommand(
// 		new Command('update')
// 			.enablePositionalOptions(true)
// 			.passThroughOptions(true)
// 			.action((options, command: Command) => {
// 				console.log({
// 					options,
// 					root: command.parent?.parent?.opts(),
// 					parent: command.parent?.opts(),
// 				});
// 			}),
// 	);
// knutCli.addCommand(indexCli);

const shareCli = KnutCommand('share')
	.argument('<node_id>')
	.addHelpText('before', 'Shares a node on s3 and provides a temporary link')
	.action((nodeId, options) => {
		share(nodeId, options);
	});
knutCli.addCommand(shareCli);
knutCli.addCommand(configCli);

export { knutCli };
