import { pipe } from 'fp-ts/lib/function.js';
import { Command } from 'commander';
import { configCli } from './subCommands/configCli.js';
import { kegCli } from './subCommands/kegCli.js';
import { searchCli } from './subCommands/searchCli.js';
import { shareCli } from './subCommands/shareCli.js';
import { updateCli } from './subCommands/updateCli.js';
import { Cmd, cmd } from './command.js';
import { version } from './internal/packageJSON.cjs';

export const rootCli: Cmd = pipe(
	cmd.context,
	cmd.map(() => new Command('knut')),
	cmd.map((c) => c.enablePositionalOptions(true)),
	cmd.map((c) => c.version(version)),
	cmd.addCommand(searchCli),
	cmd.addCommand(kegCli),
	// command.map((c) => c.addCommand(shareCli)),
	// command.map((c) => c.addCommand(configCli)),
	// command.map((c) => c.addCommand(updateCli)),
);
