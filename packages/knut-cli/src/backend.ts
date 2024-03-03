import {
	Backend as CoreBackend,
	backend as coreBackend,
} from '@jlrickert/knutjs-core/backend';
import { Future } from '@jlrickert/knutjs-core/internal/future';
import { Terminal } from './terminal.js';
import { optional } from '@jlrickert/knutjs-core/internal/optional';
import invariant from 'tiny-invariant';

export type Backend = CoreBackend & { terminal: Terminal };

type CliBackendOptions = CoreBackend & Partial<Terminal>;
export const cliBackend: (deps: CliBackendOptions) => Backend = (deps) => ({
	...deps,
	terminal: {
		input: deps.input ?? process.stdin,
		output: deps.output ?? process.stdout,
	},
});

export const detectBackend: () => Future<Backend> = async () => {
	const backend = await coreBackend.detectBackend();
	invariant(optional.isSome(backend), 'Backend not supported');
	return cliBackend({
		...backend,
		input: process.stdin,
		output: process.stdout,
	});
};
