import { Monad2 } from 'fp-ts/lib/Monad.js';
import { identity, pipe } from 'fp-ts/lib/function.js';
import { PipeableTraverse2, Traversable2 } from 'fp-ts/lib/Traversable.js';
import { Refinement } from 'fp-ts/lib/Refinement.js';
import { Optional, optional } from './optional.js';

export type Ok<T> = { type: 'Ok'; value: T };
export type Err<E> = { type: 'Err'; error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const URI = 'Result';
export type URI = typeof URI;
declare module 'fp-ts/HKT' {
	interface URItoKind2<E, A> {
		readonly [URI]: Result<A, E>;
	}
}

const ok: <T, E>(value: T) => Result<T, E> = (value) => ({ type: 'Ok', value });
const err: <T, E>(error: E) => Result<T, E> = (error) => ({
	type: 'Err',
	error,
});

function isOk<T, E>(res: Result<T, E>): res is Ok<T> {
	return res.type === 'Ok';
}

function isErr<T, E>(res: Result<T, E>): res is Err<E> {
	return res.type === 'Err';
}

const fromOptional: <T, E>(
	onErr: () => E,
) => (value: Optional<T>) => Result<T, E> = (onErr) => (value) => {
	return pipe(
		value,
		optional.match(() => err(onErr()), ok),
	) as any;
};

const fromNullable: <T, E>(onErr: () => E) => (value: T) => Result<T, E> =
	(onErr) => (value) => {
		return pipe(value, optional.fromNullable, fromOptional(onErr));
	};

const match: <A1, A2, E1, E2>(
	onErr: (e: E1) => E2,
	onOk: (a: A1) => A2,
) => (ma: Result<A1, E1>) => A2 | E2 = (onErr, onOk) => (ma) => {
	return isOk(ma) ? onOk(ma.value) : onErr(ma.error);
};

const getOrElse: <B, E>(
	onErr: (err: E) => B,
) => <A>(ma: Result<A, E>) => A | B = (onErr) => (ma) => {
	return pipe(ma, match(onErr, identity));
};

const fromPredicate: <A, B extends A, E>(
	refinement: Refinement<A, B>,
	onFalse: (a: A) => E,
) => (ma: Result<A, E>) => Result<B, E> = (refinement, onFalse) => (ma) => {
	return pipe(
		ma,
		chain((a) => (refinement(a) ? ok(a) : err(onFalse(a)))),
	);
};

const of = ok;

const map: <A, B>(f: (a: A) => B) => <E>(ma: Result<A, E>) => Result<B, E> =
	(f) => (ma) => {
		return isOk(ma) ? ok(f(ma.value)) : ma;
	};

const chain: <A, B, E>(
	f: (a: A) => Result<B, E>,
) => (ma: Result<A, E>) => Result<B, E> = (f) => (ma) => {
	return isOk(ma) ? f(ma.value) : ma;
};

const ap: <A, E>(
	ma: Result<A, E>,
) => <B>(fab: Result<(a: A) => B, E>) => Result<B, E> = (ma) => (fab) => {
	if (isErr(fab)) {
		return fab;
	}
	if (isErr(ma)) {
		return ma;
	}
	return ok(fab.value(ma.value));
};

const traverse: PipeableTraverse2<URI> = (F: any) => (f: any) => (ma: any) => {
	return isErr(ma) ? F.of(err(ma.error)) : F.map(f(ma.value), of);
};

const sequence: Traversable2<URI>['sequence'] = (F: any) => (ma: any) => {
	return isErr(ma) ? F.of(err(ma)) : F.map(ma.value, ok);
};

const Monad: Monad2<URI> = {
	URI,
	of,
	chain: (ma, fab) => pipe(ma, chain(fab)),
	map: (ma, fab) => map(fab)(ma),
	ap: (fab, ma) => ap(ma)(fab),
};

export const result = {
	ok,
	err,
	fromOptional,
	fromNullable,
	fromPredicate,
	map,
	chain,
	ap,
	getOrElse,
	traverse,
	sequence,
	Monad,
};
