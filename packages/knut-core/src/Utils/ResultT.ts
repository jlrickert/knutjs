import { Kind, URIS } from 'fp-ts/HKT';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { Refinement } from 'fp-ts/lib/Refinement.js';
import { Predicate } from 'fp-ts/lib/Predicate.js';
import { dual } from 'effect/Function';
import { pipe } from 'effect';
import { Result } from './index.js';

const ok =
	<M extends URIS>(M: Monad1<M>) =>
	<T>(value: T): Kind<M, Result.Result<T, never>> => {
		return pipe(value, Result.ok, M.of);
	};

const err =
	<M extends URIS>(M: Monad1<M>) =>
	<E>(err: E): Kind<M, Result.Result<never, E>> => {
		return pipe(err, Result.err, M.of);
	};

const map: <M extends URIS>(
	M: Monad1<M>,
) => {
	<T1, T2>(
		f: (value: T1) => T2,
	): <E>(ma: Kind<M, Result.Result<T1, E>>) => Kind<M, Result.Result<T2, E>>;
	<T1, T2, E>(
		ma: Kind<M, Result.Result<T1, E>>,
		f: (value: T1) => T2,
	): Kind<M, Result.Result<T2, E>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<T1, T2, E>(
			ma: Kind<M, Result.Result<T1, E>>,
			f: (value: T1) => T2,
		): Kind<M, Result.Result<T2, E>> => {
			return M.map(ma, Result.map(f));
		},
	);

const chain: <M extends URIS>(
	M: Monad1<M>,
) => {
	<T1, T2, E2>(
		f: (value: T1) => Kind<M, Result.Result<T2, E2>>,
	): <E1>(
		ma: Kind<M, Result.Result<T1, E1>>,
	) => Kind<M, Result.Result<T2, E1 | E2>>;
	<T1, T2, E1, E2>(
		ma: Kind<M, Result.Result<T1, E1>>,
		f: (value: T1) => Kind<M, Result.Result<T2, E2>>,
	): Kind<M, Result.Result<T2, E1 | E2>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<T1, T2, E1, E2>(
			ma: Kind<M, Result.Result<T1, E1>>,
			f: (value: T1) => Kind<M, Result.Result<T2, E2>>,
		): Kind<M, Result.Result<T2, E1 | E2>> => {
			return M.chain(ma, (res): any => {
				return Result.match(res, {
					onOk: (value) => f(value),
					onErr: (error) => err(M)(error),
				});
			});
		},
	);

const match: <M extends URIS>(
	M: Monad1<M>,
) => {
	<T1, T2, E1, E2>(options: {
		onErr: (err: E1) => E2;
		onOk: (value: T1) => T2;
	}): (ma: Kind<M, Result.Result<T1, E1>>) => Kind<M, T2 | E2>;
	<T1, T2, E1, E2>(
		ma: Kind<M, Result.Result<T1, E1>>,
		options: {
			onErr: (err: E1) => E2;
			onOk: (value: T1) => T2;
		},
	): Kind<M, T2 | E2>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<T1, T2, E1, E2>(
			ma: Kind<M, Result.Result<T1, E1>>,
			options: {
				onErr: (err: E1) => E2;
				onOk: (value: T1) => T2;
			},
		): Kind<M, T2 | E2> => {
			return M.map(ma, (a) => Result.match(a, options));
		},
	);

const ap: <M extends URIS>(
	M: Monad1<M>,
) => {
	<A, E>(
		ma: Kind<M, Result.Result<A, E>>,
	): <B>(
		mab: Kind<M, Result.Result<(a: A) => B, E>>,
	) => Kind<M, Result.Result<B, E>>;
	<A, B, E>(
		mab: Kind<M, Result.Result<(a: A) => B, E>>,
		ma: Kind<M, Result.Result<A, E>>,
	): Kind<M, Result.Result<B, E>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<A, B, E>(
			mab: Kind<M, Result.Result<(a: A) => B, E>>,
			ma: Kind<M, Result.Result<A, E>>,
		): Kind<M, Result.Result<B, E>> => {
			return M.ap(
				M.map(mab, (gab) => (ga: Result.Result<A, E>) => {
					return Result.ap(ga)(gab);
				}),
				ma,
			);
		},
	);

const alt: <M extends URIS>(
	M: Monad1<M>,
) => {
	<T2, E2>(
		second: () => Kind<M, Result.Result<T2, E2>>,
	): <T1, E1>(
		ma: Kind<M, Result.Result<T1, E1>>,
	) => Kind<M, Result.Result<T1 | T2, E2>>;
	<T1, T2, E1, E2>(
		ma: Kind<M, Result.Result<T1, E1>>,
		second: () => Kind<M, Result.Result<T2, E2>>,
	): Kind<M, Result.Result<T1 | T2, E2>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<T1, T2, E1, E2>(
			ma: Kind<M, Result.Result<T1, E1>>,
			second: () => Kind<M, Result.Result<T2, E2>>,
		): Kind<M, Result.Result<T1 | T2, E2>> => {
			return M.chain(ma, (a) => {
				const x = Result.match(a, {
					onOk: (value) => M.of(Result.of(value)),
					onErr: () => second(),
				});
				return x as any;
			});
		},
	);

const fromNullable: <M extends URIS>(
	M: Monad1<M>,
) => {
	<E>(onErr: () => E): <T>(value: T) => Kind<M, Result.Result<T, E>>;
	<T, E>(value: T, onErr: () => E): Kind<M, Result.Result<T, E>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(2, <T, E>(value: T, onErr: () => E): Kind<M, Result.Result<T, E>> => {
		return M.of(
			pipe(
				Result.of(value),
				Result.filter(
					(a) => a !== null && a !== undefined,
					() => onErr(),
				),
			),
		);
	});

const filterOrErr: <M extends URIS>(
	M: Monad1<M>,
) => {
	<T, E2>(
		predicate: Predicate<T>,
		onErr: (value: T) => E2,
	): <E1>(
		ma: Kind<M, Result.Result<T, E1>>,
	) => Kind<M, Result.Result<T, E1 | E2>>;
	<T, E1, E2>(
		ma: Kind<M, Result.Result<T, E1>>,
		predicate: Predicate<T>,
		onErr: (value: T) => E2,
	): Kind<M, Result.Result<T, E1 | E2>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		3,
		<T, E1, E2>(
			ma: Kind<M, Result.Result<T, E1>>,
			predicate: Predicate<T>,
			onErr: (value: T) => E2,
		): Kind<M, Result.Result<T, E1 | E2>> => {
			return M.map(ma, (a) => Result.filterOrErr(a, predicate, onErr));
		},
	);

const refineOrErr: <M extends URIS>(
	M: Monad1<M>,
) => {
	<T1, T2 extends T1, E2>(
		refinement: Refinement<T1, T2>,
		onErr: (value: T1) => E2,
	): <E1>(
		ma: Kind<M, Result.Result<T1, E1>>,
	) => Kind<M, Result.Result<T2, E1 | E2>>;
	<T1, T2 extends T1, E1, E2>(
		ma: Kind<M, Result.Result<T1, E1>>,
		refinement: Refinement<T1, T2>,
		onErr: (value: T1) => E2,
	): Kind<M, Result.Result<T2, E1 | E2>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		3,
		<T1, T2 extends T1, E1, E2>(
			ma: Kind<M, Result.Result<T1, E1>>,
			refinement: Refinement<T1, T2>,
			onErr: (value: T1) => E2,
		): Kind<M, Result.Result<T2, E1 | E2>> => {
			return M.map(ma, (a) => Result.refineOrErr(a, refinement, onErr));
		},
	);

export const resultT = <M extends URIS>(M: Monad1<M>) => ({
	ok: ok(M),
	err: err(M),
	of: ok(M),
	map: map(M),
	chain: chain(M),
	match: match(M),
	ap: ap(M),
	fromNullable: fromNullable(M),
	refineOrErr: refineOrErr(M),
	filterOrErr: filterOrErr(M),
	alt: alt(M),
});
