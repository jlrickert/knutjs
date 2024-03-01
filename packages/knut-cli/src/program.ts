import { Reader } from 'fp-ts/lib/Reader.js';
import { PlatformEnv, platform } from '@jlrickert/knutjs-core/platform';
import { TerminalEnv } from './terminal.js';
import { Command } from 'commander';
import { flow, pipe } from 'fp-ts/lib/function.js';
import { reader } from 'fp-ts';
import { version } from './internal/packageJSON.cjs';
import { apS, sequenceS } from 'fp-ts/lib/Apply.js';

export type ProgramEnv = PlatformEnv & TerminalEnv;
export type Program<T> = Reader<ProgramEnv, T>;
export type KnutCommand = Reader<string, Command>;

export const command: KnutCommand = (name) => new Command(name);

const customCli = pipe(
	command,
	reader.map((c) => c.action()),
);

const commandS: (
	r: Record<string, (name: string) => Command>,
) => (root: Command) => Program<Command> = (r) => (root) => (deps) => {
	const names = Object.keys(r);
	for (const name of names) {
		const command = r[name];
		root.addCommand(command(name));
	}
	return root;
};

const root = pipe(
	command,
	reader.map((c) => c('knut').enablePositionalOptions(true).version(version)),
);

const cli = commandS({ custom: customCli });

const x = sequenceS(reader.Monad)({ custom: customCli, rawr: root });

export const program = {
	command,
	testInstance,
};
