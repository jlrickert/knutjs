import { reader } from 'fp-ts';
import { Reader } from 'fp-ts/lib/Reader.js';
import { pipe } from 'fp-ts/lib/function.js';
import { Command } from 'commander';
import { Backend } from './backend.js';
import { Future } from '@jlrickert/knutjs-core/internal/future';

export type Cmd = Reader<Backend, Command>;

export type ParseResult<A, O extends Record<string, any>> = {
	args: A;
	opts: O;
};

export type Action<A, O extends Record<string, any>> = (
	result: ParseResult<A, O>,
) => Future<void>;

const run =
	(args?: string[]) =>
	async (cmd: Command): Future<void> => {
		await cmd.parseAsync(args ?? process.argv);
		return;
	};

const parse =
	(args?: string[]) =>
	<A, O extends Record<string, any>>(cmd: Cmd): Future<ParseResult<A, O>> => {
		return new Promise((resolve) => {
			return pipe(
				cmd,
				reader.map((c) =>
					c
						.action((args, opts) => {
							resolve({ args, opts });
						})
						.parseAsync(args ?? process.argv),
				),
			);
		});
	};

const context = reader.ask<Backend>();
export const command = {
	run,
	context,
	parse,
	map: reader.map,
	chain: reader.chain,
};
