import { pipe } from 'fp-ts/lib/function.js';
import { Option } from 'commander';
import { terminal } from '../terminal.js';
import { cmd } from '../command.js';
import { Knut } from '@jlrickert/knutjs-core/knut';
import { optional } from '@jlrickert/knutjs-core/internal/optional';

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
	cmd.addOption(kegOption),
	cmd.addAction(edit),
);

const directory = cmd.action<void, { keg: string }>(
	(_, { keg: alias }) =>
		async (ctx) => {
			const knut = await Knut.fromBackend(ctx);
			const keg = knut.getKeg(alias);
			if (optional.isNone(keg)) {
				await terminal.fmt(`${alias} is not a valid keg`)(ctx.terminal);
				return;
			}
			await terminal.fmtLn(keg.storage.root)(ctx.terminal);
		},
);

const directoryCli = pipe(
	cmd.make('directory'),
	cmd.alias('dir'),
	cmd.alias('d'),
	cmd.passThroughOptions(false),
	cmd.enablePositionalOptions(true),
	cmd.addOption(kegOption),
	cmd.addAction(directory),
);

const init = cmd.action<string, { keg: string; enabled: boolean }>(
	(uri, options) => async (ctx) => {
		await terminal.fmtLn(uri)(ctx.terminal);
		const knut = await Knut.fromBackend(ctx);
		const keg = await knut.initKeg(options.keg, uri);
		if (optional.isSome(keg)) {
			terminal.fmtLn(`keg "${keg}" created`)(ctx.terminal);
		}
		return;
	},
);

const initCli = pipe(
	cmd.make('init'),
	cmd.argument('<uri>', 'uri to where the keg is'),
	cmd.passThroughOptions(false),
	cmd.enablePositionalOptions(true),
	cmd.addOption(kegOption),
	cmd.option('-e, --enabled', 'Should the keg be enabled', true),
	cmd.addAction(init),
);

export const kegCli = pipe(
	cmd.make('keg'),
	cmd.enablePositionalOptions(true),
	cmd.addCommand(directoryCli),
	cmd.addCommand(initCli),
	cmd.addCommand(editCli),
);
