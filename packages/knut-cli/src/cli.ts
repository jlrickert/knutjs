import { program } from 'commander';
import { share, version } from '.';

const cli = program.version(version);

cli.command('search')
	.argument('<query>')
	.action((x) => {
		console.log(`Running search ${x}`);
	});

cli.command('node').action((x) => {
	console.log(`Running node ${x}`);
});

cli.command('index')
	.action((x) => {
		console.log(`Running index ${x}`);
	})
	.addHelpText('beforeAll', 'update index')
	.addCommand(
		program
			.command('update')
			.argument('<x>')
			.action((x) => {
				console.log(`Running index update ${x}`);
			}),
	);

cli.command('share')
	.argument('<node_id>')
	.addHelpText('before', 'Shares a node on s3 and provides a temporary link')
	.action((nodeId) => {
		share(nodeId);
	});

cli.parse(process.argv);
