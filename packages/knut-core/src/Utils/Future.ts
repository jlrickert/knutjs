import { dual } from 'effect/Function';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { identity, pipe } from 'fp-ts/lib/function.js';
import { Optional } from './Optional.js';
import { Result } from './Result.js';

export type Future<T> = Promise<T>;

export type OptionalFuture<T> = Future<Optional<T>>;
export type FutureResult<T, E> = Future<Result<T, E>>;

export const URI = 'Future';
export type URI = typeof URI;
declare module 'fp-ts/HKT' {
	interface URItoKind<A> {
		readonly [URI]: Future<A>;
	}
}

export const of: <A>(a: A) => Future<A> = (a) => Promise.resolve(a);

export const map: {
	<T1, T2>(f: (a: T1) => T2): (ma: Future<T1>) => Future<T2>;
	<T1, T2>(ma: Future<T1>, f: (value: T1) => T2): Future<T2>;
} = dual(2, <T1, T2>(ma: Future<T1>, f: (value: T1) => T2) => {
	return ma.then(f);
});

export const chain: {
	<T1, T2>(f: (a: T1) => Future<T2>): (ma: Future<T1>) => Future<T2>;
	<T1, T2>(ma: Future<T1>, f: (a: T1) => Future<T2>): Future<T2>;
} = dual(2, <T1, T2>(ma: Future<T1>, f: (a: T1) => Future<T2>): Future<T2> => {
	return ma.then(f);
});

export const andThen: {
	<T1, T2>(f: (a: T1) => Future<T2>): (ma: Future<T1>) => T2 | Future<T2>;
	<T1, T2>(ma: Future<T1>, f: (a: T1) => Future<T2>): T2 | Future<T2>;
} = chain;

export const apSeq: {
	<T2>(ma: Future<T2>): <T1>(fab: Future<(value: T2) => T1>) => Future<T2>;
	<T1, T2>(fab: Future<(value: T1) => T2>, ma: Future<T1>): Future<T2>;
} = dual(
	2,
	async <T1, T2>(fab: Future<(a: T1) => T2>, ma: Future<T1>): Future<T2> => {
		const f = await fab;
		const a = await ma;
		return f(a);
	},
);

export const apPar: {
	<T2>(ma: Future<T2>): <T1>(fab: Future<(a: T2) => T1>) => Future<T1>;
	<T1, T2>(fab: Future<(a: T1) => T2>, ma: Future<T1>): Future<T2>;
} = dual(
	2,
	async <A, B>(fab: Future<(a: A) => B>, ma: Future<A>): Future<B> => {
		const [f, a] = await Promise.all([fab, ma]);
		return f(a);
	},
);

export const ap: {
	<T2>(fa: Future<T2>): <T1>(fab: Future<(a: T2) => T1>) => Future<T1>;
	<T1, T2>(fab: Future<(a: T1) => T2>, ma: Future<T1>): Future<T2>;
} = apPar;

export const tap: {
	<T>(f: (a: T) => void): (ma: Future<T>) => Future<T>;
	<T>(ma: Future<T>, f: (value: T) => void): Future<T>;
} = dual(2, async <T>(ma: Future<T>, f: (value: T) => void): Future<T> => {
	const value = await ma;
	f(value);
	return value;
});

export const flatten: <A>(ma: Future<Future<A>>) => Future<A> = (ma) => {
	return pipe(ma, chain(identity));
};

export const Do: Future<{}> = of({});

export const assign: {
	<N extends string, A, B>(
		name: Exclude<N, keyof A>,
		f: (a: A) => B,
	): (ma: Future<A>) => Future<{
		readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
	}>;
	<N extends string, A, B>(
		ma: Future<A>,
		name: Exclude<N, keyof A>,
		f: (a: A) => B,
	): Future<{
		readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
	}>;
} = dual(
	3,
	async <N extends string, A, B>(
		ma: Future<A>,
		name: Exclude<N, keyof A>,
		f: (a: A) => B,
	): Future<{
		readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
	}> => {
		const value = f(await ma);
		return Object.assign({}, await ma, { [name]: value }) as any;
	},
);

export const bind: {
	<N extends string, A, B>(
		name: Exclude<N, keyof A>,
		f: (a: A) => Future<B>,
	): (ma: Future<A>) => Future<{
		readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
	}>;
	<N extends string, A, B>(
		ma: Future<A>,
		name: Exclude<N, keyof A>,
		f: (a: A) => Future<B>,
	): Future<{
		readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
	}>;
} = dual(
	3,
	async <N extends string, A, B>(
		ma: Future<A>,
		name: Exclude<N, keyof A>,
		f: (a: A) => Future<B>,
	) => {
		const value = await f(await ma);
		return Object.assign({}, await ma, { [name]: value }) as any;
	},
);

export const bindTo: {
	<N extends string>(
		name: N,
	): <A>(ma: Future<A>) => Future<{ readonly [K in N]: A }>;
	<N extends string, A>(
		ma: Future<A>,
		name: N,
	): Future<{ readonly [K in N]: A }>;
} = dual(2, <N extends string, A>(ma: Future<A>, name: N) => {
	return bind(Do, name, () => ma);
});

export const Monad: Monad1<URI> = {
	URI: URI,
	of,
	chain,
	map,
	ap,
};
