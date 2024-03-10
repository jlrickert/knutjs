import { pipe } from 'fp-ts/lib/function.js';
import { Command } from 'commander';
import { configCli } from './subCommands/configCli.js';
import { kegCli } from './subCommands/kegCli.js';
import { searchCli } from './subCommands/searchCli.js';
import { shareCli } from './subCommands/shareCli.js';
import { updateCli } from './subCommands/updateCli.js';
import { Cmd, command } from './command.js';
import { version } from './internal/packageJSON.cjs';

export const rootCli: Cmd = pipe(
	command.context,
	command.map(() => new Command('knut')),
	command.map((c) => c.enablePositionalOptions(true)),
	command.map((c) => c.version(version)),
	command.chain((c) => (backend) => c.addCommand(searchCli(backend))),
	command.chain((c) => (backend) => c.addCommand(kegCli(backend))),
	// command.map((c) => c.addCommand(shareCli)),
	// command.map((c) => c.addCommand(configCli)),
	// command.map((c) => c.addCommand(updateCli)),
);
