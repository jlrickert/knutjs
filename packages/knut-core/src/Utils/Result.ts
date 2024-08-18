import { Monad2 } from 'fp-ts/lib/Monad.js';
import { PipeableTraverse2, Traversable2 } from 'fp-ts/lib/Traversable.js';
import { Refinement } from 'fp-ts/lib/Refinement.js';
import { Predicate } from 'fp-ts/lib/Predicate.js';
import { dual } from 'effect/Function';
import invariant from 'tiny-invariant';
import { Optional, pipe, Result } from './index.js';

export type Result<T, E> = Ok<T, E> | Err<T, E>;
export interface Ok<out T, out E> {
	value: T;
}
export interface Err<out T, out E> {
	error: E;
}

export const URI = 'Result';
export type URI = typeof URI;
declare module 'fp-ts/HKT' {
	interface URItoKind2<E, A> {
		readonly [URI]: Result<A, E>;
	}
}

export const ok = <T>(value: T): Result<T, never> => {
	return { value };
};

export const err = <E>(error: E): Result<never, E> => {
	return { error };
};

export function isOk<T, E>(res: Result<T, E>): res is Ok<T, E> {
	return 'value' in res;
}

export function isErr<T, E>(res: Result<T, E>): res is Err<T, E> {
	return 'error' in res;
}

export const fromOptional: {
	<T, E>(onErr: () => E): (value: Optional.Optional<T>) => Result<T, E>;
	<T, E>(value: Optional.Optional<T>, onErr: () => E): Result<T, E>;
} = dual(2, <T, E>(value: Optional.Optional<T>, onErr: () => E) => {
	if (Optional.isSome(value)) {
		return ok(value);
	}
	return err(onErr());
});

export const tryCatch: {
	<E>(onErr: (e: unknown) => E): <T>(f: () => T) => Result<T, E>
	<T, E>(f: () => T, onError: (e: unknown) => E): Result<T, E>
} = dual(2, <T, E>(f: () => T, onErr: (e: unknown) => E): Result<T, E> => {
	try {
		return Result.ok(f())
	} catch (e) {
		return Result.err(onErr(e))
	}
})

export const fromNullable: {
	<T, E>(onErr: () => E): (value: T) => Result<T, E>;
	<T, E>(value: T, onErr: () => E): Result<T, E>;
} = dual(2, <T, E>(value: T, onErr: () => E): Result<T, E> => {
	return fromOptional(Optional.fromNullable(value), () => onErr());
});

export const match: {
	<T1, E1, E2, T2>(options: {
		readonly onOk: (ok: T1) => T2;
		readonly onErr: (err: E1) => E2;
	}): (ma: Result<T1, E1>) => T2 | E2;
	<T1, E1, E2, T2>(
		ma: Result<T1, E1>,
		options: {
			readonly onOk: (ok: T1) => T2;
			readonly onErr: (err: E1) => E2;
		},
	): T2 | E2;
} = dual(
	2,
	<T1, E1, T2, E2>(
		ma: Result<T1, E1>,
		options: {
			readonly onOk: (ok: T1) => T2;
			readonly onErr: (err: E1) => E2;
		},
	) => {
		if (isOk(ma)) {
			return options.onOk(ma.value);
		}
		return options.onErr(ma.error);
	},
);

export const getOrElse: {
	<B, E>(onErr: (err: E) => B): <A>(ma: Result<A, E>) => A | B;
	<A, B, E>(
		ma: Result<A, E>,
		onErr: (err: E) => B,
	): <A>(ma: Result<A, E>) => A | B;
} = dual(2, <A, B, E>(ma: Result<A, E>, onErr: (err: E) => B) => {
	if (isOk(ma)) {
		return ma.value;
	}
	return onErr(ma.error);
});

/**
 * This crashes the application if inner value is an error.
 */
export const unwrap: {
	<A>(ma: Result<A, any>): A;
} = (ma) => {
	invariant(isOk(ma), 'Programming error. Unable to unwrap an error value');
	return ma.value;
};

/**
 * This crashes the application if inner value is an error.
 */
export const unwrapErr: {
	<E>(ma: Result<any, E>): E;
} = (ma) => {
	invariant(isErr(ma), 'Programming error. Unable to unwrap an error value');
	return ma.error;
};

export const refineOrErr: {
	<T1, T2 extends T1, E1, E2>(
		refinement: Refinement<T1, T2>,
		onErr: (value: T1) => E1,
	): (ma: Result<T1, E1>) => Result<T2, E1 | E2>;
	<T1, T2 extends T1, E1, E2>(
		ma: Result<T1, E1>,
		refinement: Refinement<T1, T2>,
		onErr: (value: T1) => E2,
	): Result<T2, E1 | E2>;
} = dual(
	3,
	<T1, T2 extends T1, E>(
		ma: Result<T1, E>,
		refinement: Refinement<T1, T2>,
		onErr: (value: T1) => E,
	): Result<T2, E> => {
		if (isErr(ma)) {
			return err(ma.error);
		}
		if (refinement(ma.value)) {
			return ok(ma.value);
		}
		return err(onErr(ma.value));
	},
);

export const filterOrErr: {
	<T, E1, E2>(
		Predicate: Predicate<T>,
		onErr: (value: T) => E1,
	): (ma: Result<T, E1>) => Result<T, E1 | E2>;
	<T, E1, E2>(
		ma: Result<T, E1>,
		predicate: Predicate<T>,
		onErr: (value: T) => E2,
	): Result<T, E1 | E2>;
} = dual(
	3,
	<T1, E>(
		ma: Result<T1, E>,
		predicate: Predicate<T1>,
		onErr: (value: T1) => E,
	): Result<T1, E> => {
		if (isErr(ma)) {
			return ma;
		}
		if (predicate(ma.value)) {
			return ma;
		}
		return err(onErr(ma.value));
	},
);

export const filter: {
	<T, E>(
		pred: Predicate<T>,
		onFalse: (value: T) => E,
	): (ma: Result<T, E>) => Result<T, E>;
	<T, E>(
		ma: Result<T, E>,
		pred: Predicate<T>,
		onFalse: (value: T) => E,
	): Result<T, E>;
} = dual(
	3,
	<T1, T2 extends T1, E>(
		ma: Result<T1, E>,
		refinement: Refinement<T1, T2>,
		onFalse: (value: T1) => E,
	): Result<T2, E> => {
		if (isErr(ma)) {
			return err(ma.error);
		}
		if (refinement(ma.value)) {
			return ma as any;
		}
		return err(onFalse(ma.value));
	},
);

export const of = ok;

export const map: {
	<T1, T2>(f: (value: T1) => T2): <E>(ma: Result<T1, E>) => Result<T2, E>;
	<T1, T2, E>(ma: Result<T1, E>, f: (value: T1) => T2): Result<T2, E>;
} = dual(
	2,
	<T1, E, T2>(ma: Result<T1, E>, f: (value: T1) => T2): Result<T2, E> => {
		if (isOk(ma)) {
			return ok(f(ma.value));
		}
		return ma as any;
	},
);

export const chain: {
	<T1, T2, E2>(
		f: (value: T1) => Result<T2, E2>,
	): <E1>(ma: Result<T1, E1>) => Result<T2, E1 | E2>;
	<T1, T2, E1, E2>(
		ma: Result<T1, E1>,
		f: (value: T1) => Result<T2, E2>,
	): Result<T2, E1 | E2>;
} = dual(
	2,
	<T1, T2, E1, E2>(
		ma: Result<T1, E1>,
		f: (value: T1) => Result<T2, E2>,
	): Result<T2, E1 | E2> => {
		return match(ma, { onOk: (value) => f(value), onErr: (a) => err(a) });
	},
);

export const ap: {
	<T1, E2>(
		ma: Result<T1, E2>,
	): <T2, E1>(mab: Result<(value: T1) => T2, E1>) => Result<T2, E1 | E2>;
	<T1, E2, T2, E1>(): (
		mab: Result<(value: T1) => T2, E1>,
		ma: Result<T1, E2>,
	) => Result<T2, E1 | E2>;
} = dual(
	2,
	<T1, T2, E1, E2>(
		mab: Result<(value: T1) => T2, E2>,
		ma: Result<T1, E1>,
	): Result<T2, E1 | E2> => {
		if (isErr(mab)) {
			return err(mab.error);
		}
		if (isErr(ma)) {
			return err(ma.error);
		}
		return of(mab.value(ma.value));
	},
);

export const traverse: PipeableTraverse2<URI> =
	(F: any) => (f: any) => (ma: any) => {
		return isErr(ma) ? F.of(err(ma.error)) : F.map(f(ma.value), of);
	};

export const sequence: Traversable2<URI>['sequence'] =
	(F: any) => (ma: any) => {
		return isErr(ma) ? F.of(err(ma)) : F.map(ma.value, ok);
	};

export const alt: {
	<T2, E2>(
		f: () => Result<T2, E2>,
	): <T1>(ma: Result<T1, E2>) => Result<T1 | T2, E2>;

	<T1, E2, T2, E1>(
		ma: Result<T1, E1>,
		f: () => Result<T2, E2>,
	): Result<T1 | T2, E2>;
} = dual(
	2,
	<T1, T2, E1, E2>(
		ma: Result<T1, E1>,
		f: () => Result<T2, E2>,
	): Result<T1 | T2, E2> => {
		return match(ma, { onErr: () => f(), onOk: (value) => ma as any });
	},
);

export const getOk = <T, E>(ma: Result<T, E>): Optional.Optional<T> => {
	if (isOk(ma)) {
		return Optional.of(ma.value);
	}
	return Optional.none;
};

export const getErr = <T, E>(ma: Result<T, E>): Optional.Optional<E> => {
	if (isErr(ma)) {
		return Optional.of(ma.error);
	}
	return Optional.none;
};

export const Monad: Monad2<URI> = {
	URI: URI,
	of,
	chain: (ma, fab) => pipe(ma, chain(fab)),
	map: (ma, fab) => map(fab)(ma),
	ap: (fab, ma) => pipe(fab, ap(ma)),
};
