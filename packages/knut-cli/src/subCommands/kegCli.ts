import { Reader } from 'fp-ts/lib/Reader.js';
import { pipe, flow } from 'fp-ts/lib/function.js';
import { Command, Option } from 'commander';
import { future } from '@jlrickert/knutjs-core/internal/future';
import { Backend } from '../backend.js';
import { Keg } from '@jlrickert/knutjs-core/keg';
import { optionalT } from '@jlrickert/knutjs-core/internal/optionalT';
import { KnutConfigFile } from '@jlrickert/knutjs-core/configFile';
import { KnutCommand } from '../knut.js';
import { terminal } from '../terminal.js';
import { Cmd, command } from '../command.js';

type Action<T> = Reader<Backend, T>;

// const directory: Action<string> = reader.map flow(() => {
// 	return 'x';
// });

// const directoryCli = (backend: Backend) => cmdM.Cmd<string>();

const aliasOption = new Option('-k, --keg <keg>', 'Keg alias')
	.makeOptionMandatory(true)
	.env('KEG_CURRENT');

const edit = (args: {}, options: any) => (backend: Backend) => {};

const editCli = (backend: Backend) => {
	return new Command('edit');
};

const directory = (args: {}, options: any) => (backend: Backend) => {
	terminal.fmtLn('some directory')(backend.terminal);
};

const directoryCli = (backend: Backend) =>
	new Command('dir')
		.addOption(aliasOption)
		.action((args, options) => directory(args, options)(backend));

const init =
	(uri: string, options: { keg: string; enabled: boolean }) =>
	async (backend: Backend) => {
		terminal.fmtLn(uri)(backend.terminal);
		const T = optionalT(future.Monad);
		terminal.fmtLn('test message')(backend.terminal);
		await pipe(
			backend.loader(uri),
			T.chain(Keg.init),
			T.chain(() => {
				return pipe(
					KnutConfigFile.fromStorage(backend.variable),
					T.alt(() =>
						T.some(KnutConfigFile.create(backend.variable.root)),
					),
				);
			}),
			T.map((config) => {
				config.data.kegs.push({
					enabled: true,
					url: uri,
					alias: options.keg,
				});
				terminal.fmtLn('rawr')(backend.terminal);
				return config;
			}),
		);
		return;
	};

// export const initCli: Cmd = (backend: Backend) =>
// 	KnutCommand('init')
// 		.argument('<uri>', 'uri to where the keg is')
// 		.passThroughOptions(false)
// 		.enablePositionalOptions(true)
// 		.addOption(aliasOption)
// 		.option('-e, --enabled', 'Should the keg be enabled', true)
// 		.action(async (uri, opts) => {
// 			console.log(uri);
// 			return await init(uri, opts)(backend);
// 		});

const initCli: Cmd = pipe(
	command.context,
	command.map(() => KnutCommand('init')),
	command.map((c) => c.argument('<uri>', 'uri to where the keg is')),
	command.map((c) => c.passThroughOptions(false)),
	command.map((c) => c.enablePositionalOptions(true)),
	command.map((c) => c.addOption(aliasOption)),
	command.map((c) =>
		c.option('-e, --enabled', 'Should the keg be enabled', true),
	),
	command.chain(
		(c) => (backend) =>
			c.action(async (uri, opts) => {
				return await init(uri, opts)(backend);
			}),
	),
);

export const kegCli: Cmd = pipe(
	command.context,
	command.map(() => KnutCommand('keg')),
	command.chain((c) => (backend) => c.addCommand(initCli(backend))),
	command.chain((c) => (backend) => c.addCommand(editCli(backend))),
	command.chain((c) => (backend) => c.addCommand(directoryCli(backend))),
);

// export const kegCli = (backend: Backend) =>
// 	cmdM.Cmd<string, { alias: string }>(
// 		'keg',
// 		async (args, { alias }) => {},
// 		async (c) => {
// 			c.addOption(aliasOption);
// 			c.option('-a, --alias', 'Alias ');
// 			c.addCommand(backend);
// 		},
// 	);
// const directoryCli = new Command('directory').action(
// 	(options, parent: Command) => {
// 		console.log({ message: 'ok', options, parent: parent });
// 	},
// );
// return new Command('keg').addCommand(directoryCli);
// };
