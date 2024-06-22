import { Monad2 } from 'fp-ts/lib/Monad.js';
import { PipeableTraverse2, Traversable2 } from 'fp-ts/lib/Traversable.js';
import { Refinement } from 'fp-ts/lib/Refinement.js';
import { Optional, pipe } from './index.js';
import { Either } from 'effect';

export type Result<T, E = never> = Ok<T, E> | Err<T, E>;
export interface Ok<out T, out E> extends Either.Right<E, T> {}
export interface Err<out T, out E> extends Either.Left<E, T> {}

export const URI = 'Result';
export type URI = typeof URI;
declare module 'fp-ts/HKT' {
	interface URItoKind2<E, A> {
		readonly [URI]: Result<A, E>;
	}
}

export const ok = <T>(value: T): Result<T> => {
	return Either.right(value);
};

export const err = <E>(error: E): Either.Either<never, E> => {
	return Either.left(error);
};

export function isOk<T, E>(res: Result<T, E>): res is Ok<T, E> {
	return Either.isRight(res);
}

export function isErr<T, E>(res: Result<T, E>): res is Err<T, E> {
	return Either.isLeft(res);
}

export const fromOptional: <T, E>(
	onErr: () => E,
) => (value: Optional.Optional<T>) => Result<T, E> = (onErr) => (value) => {
	if (Optional.isSome(value)) {
		return ok(value);
	}
	return err(onErr());
};

export const fromNullable: <T, E>(
	onErr: () => E,
) => (value: T) => Result<T, E> = (onErr) => (value) => {
	return Either.fromNullable(value, onErr);
};

export const match: <T, B, E, C = B>(options: {
	readonly onOk: (ok: T) => C;
	readonly onErr: (err: E) => B;
}) => (ma: Result<T, E>) => B | C =
	({ onOk, onErr }) =>
	(ma) => {
		return Either.match(ma, { onLeft: onErr, onRight: onOk });
	};

export const getOrElse: <B, E>(
	onErr: (err: E) => B,
) => <A>(ma: Result<A, E>) => A | B = (onErr) => (ma) => {
	return Either.getOrElse(ma, onErr);
};

export const fromPredicate: <T, B extends T, E>(
	refinement: Refinement<T, B>,
	onFalse: (value: T) => E,
) => (ma: Result<T, E>) => Result<B, E> = (refinement, onFalse) => (ma) => {
	return pipe(ma, Either.filterOrLeft(refinement, onFalse));
};

export const of = ok;

export const map = Either.map;

export const chain = Either.andThen;

export const ap = Either.ap;

export const traverse: PipeableTraverse2<URI> =
	(F: any) => (f: any) => (ma: any) => {
		return isErr(ma) ? F.of(err(ma.left)) : F.map(f(ma.value), of);
	};

export const sequence: Traversable2<URI>['sequence'] =
	(F: any) => (ma: any) => {
		return isErr(ma) ? F.of(err(ma)) : F.map(ma.value, ok);
	};

export const Monad: Monad2<URI> = {
	URI,
	of,
	chain: (ma, fab) => pipe(ma, chain(fab)),
	map: (ma, fab) => map(fab)(ma),
	ap: (fab, ma) => ap(ma)(fab),
};
