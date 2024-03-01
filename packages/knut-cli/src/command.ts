import { reader } from 'fp-ts';
import { pipe } from 'fp-ts/lib/function.js';
import { Future } from '@jlrickert/knutjs-core/internal/future';
import { Command, ParseOptions } from 'commander';
import { Program, ProgramEnv } from './program.js';

const create: (f: (c: Command) => void) => (name: string) => Program<Command> =
	(f) => (name) => (string) => {
		const c = new Command(name);
		f(c);
		return c;
	};

const searchCli: (name: string) => Program<Command> = create((c) => c);
const queryCli: (name: string) => Program<Command> = create((c) => c);

const rootCli: (name: string) => Program<Command> = create((root) => {
	return pipe(
		reader.ask<ProgramEnv>(),
		reader.bindW('search', ({}) => searchCli('search')),
		reader.bindW('query', ({}) => queryCli('query')),
		reader.map(({}) => root.option('').option('')),
	);
});

const run: (
	args: string[],
	parseArgs?: ParseOptions,
) => (c: Command) => Future<Command> = (args, parseArgs) => async (c) => {
	return c.parseAsync(args, parseArgs);
};

export const command = {
	create,
};

const program = rootCli('knut');
