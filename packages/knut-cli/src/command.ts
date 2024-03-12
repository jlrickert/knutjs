import { reader } from 'fp-ts';
import { pipe } from 'fp-ts/lib/function.js';
import { Future, future } from '@jlrickert/knutjs-core/internal/future';
import { Command, Option } from 'commander';
import { Backend, backend } from './backend.js';
import { KnutCommand } from './knut.js';
import { optional } from '@jlrickert/knutjs-core/internal/optional';

export type Cmd = Backend<Command>;

export type ParseResult<A, O extends Record<string, any>> = {
	args: A;
	opts: O;
};

const run =
	(args?: string[]) =>
	async (cmd: Command): Future<void> => {
		await cmd.parseAsync(args ?? process.argv);
		return;
	};

const parse =
	(args?: string[]) =>
	async <A, O extends Record<string, any>>(
		cmd: Cmd,
	): Future<ParseResult<A, O>> => {
		return new Promise((resolve) => {
			return pipe(
				cmd,
				reader.map(
					future.map(async (c) =>
						c
							.action((args, opts) => {
								resolve({ args, opts });
							})
							.parseAsync(args ?? process.argv),
					),
				),
			);
		});
	};

const context = backend.context;

const make = (name: string): Cmd =>
	pipe(
		context,
		backend.map(() => KnutCommand(name)),
	);

const addCommand: (cmd: Cmd) => (ma: Cmd) => Cmd = (cmd) =>
	backend.chain((c) => async (ctx) => c.addCommand(await cmd(ctx)));

const argument = <T>(flags: string, description: string, defaultValue?: T) =>
	backend.map((c: Command) => c.argument(flags, description, defaultValue));

const option = (
	flags: string,
	description?: string,
	defaultValue?: string | boolean | string[],
) => backend.map((c: Command) => c.option(flags, description, defaultValue));

const parseOption = <T>(
	flags: string,
	description: string,
	parseArg: (value: string, previous: T) => T,
	defaultValue?: T,
) =>
	backend.map((c: Command) =>
		c.option(flags, description, parseArg, defaultValue),
	);

const parseArgument = <T>(
	flags: string,
	description: string,
	fn: (value: string, previous: T) => T,
	defaultValue?: T,
) =>
	backend.map((c: Command) =>
		c.argument(flags, description, fn, defaultValue),
	);

const addOption = (option: Option) =>
	backend.map((c: Command) => c.addOption(option));

const passThroughOptions = (flag: boolean) =>
	backend.map((c: Command) => c.passThroughOptions(flag));

const enablePositionalOptions = (flag: boolean) =>
	backend.map((c: Command) => c.enablePositionalOptions(flag));

export type Action<A, O> = (args: A, opts: O, parent: Command) => Future<void>;

const addAction = <A, O>(action: Backend<Action<A, O>>) =>
	backend.chain((c: Command) => async (ctx) => {
		c.action(async (args, opts, parent) => {
			const f = await action(ctx);

			// In the case that argments haven't been set args is opts and opts is parent.
			if (optional.isNone(parent)) {
				await f(void {} as A, args, opts);
				return;
			}
			await f(args, opts, parent);
		});
		return c;
	});

const action = <A, O>(
	f: (args: A, opts: O, parent: Command) => Backend<void>,
): Backend<Action<A, O>> => {
	return async (ctx) => async (a, b, c) => {
		return f(a, b, c)(ctx);
	};
};

const alias = (alias: string) => backend.map((c: Command) => c.alias(alias));

export const cmd = {
	run,
	context,
	subContext: backend.subContext,
	make,
	parse,
	map: backend.map,
	chain: backend.chain,
	alias,
	addCommand,
	argument,
	parseArgument,
	option,
	parseOption,
	addOption,
	passThroughOptions,
	enablePositionalOptions,
	addAction,
	action,
};
