import * as path from 'path';
import { Option } from 'commander';
import invariant from 'tiny-invariant';
import { absurd, pipe } from 'fp-ts/lib/function.js';
import { Knut } from '@jlrickert/knutjs-core/knut';
import { stringify } from '@jlrickert/knutjs-core/utils';
import { optional } from '@jlrickert/knutjs-core/internal/optional';
import { terminal } from '../terminal.js';
import { cmd } from '../command.js';
import { backend } from '../backend.js';

const kegOption = new Option('-k, --keg <keg>', 'Keg alias')
	.makeOptionMandatory(true)
	.env('KEG_CURRENT');

const edit = cmd.action<number, { keg: string; enabled: boolean }>(
	(args, opts, parent) => async (ctx) => {
		return;
	},
);

const editCli = pipe(
	cmd.make('edit'),
	// cmd.addOption(kegOption),
	cmd.addAction(edit),
);

const directory = cmd.action<void, {}>((_, {}, command) => async (ctx) => {
	const global = command.parent?.opts() as { keg: string };
	invariant(global.keg, 'Should not get this far if keg is not defined');
	const knut = await Knut.fromBackend(ctx);
	const keg = knut.getKeg(global.keg);
	if (optional.isNone(keg)) {
		await terminal.fmt(`${global.keg} is not a valid keg`)(ctx.terminal);
		return;
	}
	await terminal.fmtLn(keg.storage.root)(ctx.terminal);
});

const directoryCli = pipe(
	cmd.make('directory'),
	cmd.alias('dir'),
	cmd.alias('d'),
	cmd.addAction(directory),
);

type Format = 'short' | 'long';
const formatOption = new Option('-f, --format <format>', 'Format to use')
	.choices(['short', 'long'])
	.default('short');

const create = cmd.action<void, { format: Format }>(
	(uri, options, command) => async (ctx) => {
		const global = command.parent?.opts<{ keg: string }>();
		invariant(
			optional.isSome(global),
			'Expect keg to be a required parameter',
		);
		const knut = await Knut.fromBackend(ctx);
		const keg = knut.getKeg(global.keg);
		if (optional.isNone(keg)) {
			await terminal.fmtLn('no keg found')(ctx.terminal);
			return;
		}
		const nodeId = await keg.createNode();
		if (optional.isNone(nodeId)) {
			await terminal.fmt('unable to create keg')(ctx.terminal);
			return;
		}
		switch (options.format) {
			case 'short': {
				await terminal.fmtLn(stringify(nodeId))(ctx.terminal);
				return;
			}
			case 'long': {
				await terminal.fmtLn(
					path.join(keg.storage.root, stringify(nodeId)),
				)(ctx.terminal);
				return;
			}

			default: {
				return absurd(options.format);
			}
		}
	},
);

const createCli = pipe(
	cmd.make('create'),
	cmd.alias('c'),
	cmd.passThroughOptions(true),
	cmd.enablePositionalOptions(true),
	cmd.addOption(formatOption),
	cmd.option('-t, --template <template>', 'Use a template'),
	backend.chain((c) => async (ctx) => {
		c.addOption(
			new Option('-t, --template, <template>', 'Template to use').choices(
				['daily', 'job'],
			),
		);
		return c;
	}),
	cmd.addAction(create),
);

const init = cmd.action<string, { keg: string; enabled: boolean }>(
	(uri, options, command) => async (ctx) => {
		const global = command.parent?.opts() as { keg: string };
		await terminal.fmtLn(uri)(ctx.terminal);
		const knut = await Knut.fromBackend(ctx);
		const keg = await knut.initKeg(global.keg, uri);
		if (optional.isSome(keg)) {
			terminal.fmtLn(`keg "${keg}" created`)(ctx.terminal);
		}
		return;
	},
);

const initCli = pipe(
	cmd.make('init'),
	cmd.argument('<uri>', 'uri to where the keg is'),
	cmd.passThroughOptions(true),
	cmd.enablePositionalOptions(true),
	cmd.option('-e, --enabled', 'Should the keg be enabled', true),
	cmd.alias('i'),
	cmd.addAction(init),
);

export const kegCli = pipe(
	cmd.make('keg'),
	cmd.addOption(kegOption),
	cmd.addCommand(directoryCli),
	cmd.addCommand(initCli),
	cmd.addCommand(editCli),
	cmd.addCommand(createCli),
);
