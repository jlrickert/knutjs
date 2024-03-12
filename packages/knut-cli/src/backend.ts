import { reader } from 'fp-ts';
import {
	Backend as CoreBackend,
	backend as coreBackend,
} from '@jlrickert/knutjs-core/backend';
import { Terminal, terminal } from './terminal.js';
import { optional } from '@jlrickert/knutjs-core/internal/optional';
import invariant from 'tiny-invariant';
import { Reader } from 'fp-ts/lib/Reader.js';
import { Future, future } from '@jlrickert/knutjs-core/internal/future';
import { flow, pipe } from 'fp-ts/lib/function.js';

export type BackendContext = CoreBackend & { terminal: Terminal };
export type Backend<T> = Reader<BackendContext, Future<T>>;

const context: Backend<BackendContext> = pipe(
	reader.ask<BackendContext>(),
	reader.map((ctx) => future.of(ctx)),
);
const subContext = <A>(f: (backend: BackendContext) => A): Backend<A> =>
	pipe(
		reader.asks(f),
		reader.map((ctx) => future.of(ctx)),
	);

const tap: <T>(
	f: (value: T) => Future<void>,
) => (ma: Backend<T>) => Backend<T> = (f) =>
	reader.map(
		future.chain(async (a) => {
			await f(a);
			return a;
		}),
	);

const of: <T>(value: T) => Backend<T> = flow(future.of, reader.of);
const map: <A, B>(f: (a: A) => B) => (ma: Backend<A>) => Backend<B> = flow(
	future.map,
	reader.map,
);

const ap: <A>(
	value: Backend<A>,
) => <B>(ma: Backend<(value: A) => Backend<B>>) => Backend<B> =
	(value) => (ma) => {
		return async (ctx) => {
			const f = await ma(ctx);
			const a = await value(ctx);
			return f(a)(ctx);
		};
	};

const chain: <A, B>(
	f: (a: A) => Backend<B>,
) => (ma: Backend<A>) => Backend<B> = (f) => (ma) => {
	return async (ctx) => {
		const value = await ma(ctx);
		const next = f(value);
		return next(ctx);
	};
};

export const backend = {
	context,
	subContext,
	of,
	ap,
	map,
	chain,
	tap,
};

export const cliBackend: (
	core: CoreBackend,
	terminal: Partial<Terminal>,
) => BackendContext = (core, term) => ({
	...core,
	terminal: terminal.make({
		input: term.input ?? process.stdin,
		output: term.output ?? process.stdout,
	}),
});

export const detectBackend = async () => {
	const core = await coreBackend.detectBackend();
	invariant(optional.isSome(core), 'Backend not supported');
	const term = terminal.make({
		input: process.stdin,
		output: process.stdout,
	});
	return cliBackend(core, term);
};
