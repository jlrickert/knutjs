import { Command } from 'commander';

export const kegCli = new Command('keg').addCommand(
	new Command('directory').action((options, parent: Command) => {
		console.log({ message: 'ok', options, parent: parent });
	}),
);
