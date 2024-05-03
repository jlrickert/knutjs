import { Applicative1 } from 'fp-ts/lib/Applicative.js';
import { Apply1 } from 'fp-ts/lib/Apply.js';
import { Chain1 } from 'fp-ts/lib/Chain.js';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { identity, pipe } from 'fp-ts/lib/function.js';

export type Future<A> = Promise<A>;

export const URI = 'Future';
export type URI = typeof URI;
declare module 'fp-ts/HKT' {
	interface URItoKind<A> {
		readonly [URI]: Future<A>;
	}
}

export const of: <A>(a: A) => Future<A> = (a) => Promise.resolve(a);

export const map: <A, B>(f: (a: A) => B) => (ma: Future<A>) => Future<B> =
	(f) => (ma) => {
		return ma.then(f);
	};

export const chain: <A, B>(f: (a: A) => Future<B>) => (ma: Future<A>) => Future<B> =
	(f) => (ma) => {
		return ma.then(f);
	};

export const apSeq: <A>(fa: Future<A>) => <B>(fab: Future<(a: A) => B>) => Future<B> =
	(fa) => (fab) => {
		return pipe(
			fab,
			chain((f) => pipe(fa, map(f))),
		);
	};

export const apPar: <A>(fa: Future<A>) => <B>(fab: Future<(a: A) => B>) => Future<B> =
	(fa) => (fab) => {
		return Promise.all([fab, fa]).then(([f, a]) => f(a));
	};

export const ap: <A>(fa: Future<A>) => <B>(fab: Future<(a: A) => B>) => Future<B> =
	(fa) => (fab) => {
		return pipe(fab, apPar(fa));
	};

export const tap: <A>(f: (a: A) => void) => (ma: Future<A>) => Future<A> =
	(f) => (ma) => {
		return pipe(
			ma,
			chain(async (a) => {
				await f(a);
				return a;
			}),
		);
	};

export const flatten: <A>(ma: Future<Future<A>>) => Future<A> = (ma) => {
	return pipe(ma, chain(identity));
};

export const Do: Future<{}> = of({});

export const assign: <N extends string, A, B>(
	name: Exclude<N, keyof A>,
	f: (a: A) => B,
) => (ma: Future<A>) => Future<{
	readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
}> = (name, f) => async (ma) => {
	const value = f(await ma);
	return Object.assign({}, await ma, { [name]: value }) as any;
};

export const bind: <N extends string, A, B>(
	name: Exclude<N, keyof A>,
	f: (a: A) => Future<B>,
) => (ma: Future<A>) => Future<{
	readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
}> = (name, f) => async (ma) => {
	const value = await f(await ma);
	return Object.assign({}, await ma, { [name]: value }) as any;
};

export const bindTo: <N extends string>(
	name: N,
) => <A>(ma: Future<A>) => Future<{ readonly [K in N]: A }> =
	(name) => (ma) => {
		return pipe(
			Do,
			bind(name, () => ma),
		) as any;
	};

export const Monad: Monad1<URI> = {
	URI: URI,
	of,
	chain: (ma, fab) => chain(fab)(ma),
	map: (ma, fab) => map(fab)(ma),
	ap: (fab, ma) => apPar(ma)(fab),
};

export const future = {
	of,
	ap,
	apSeq,
	apPar,
	tap,
	flatten,
	map,
	chain,
	Do,
	bind,
	bindTo,
	Monad,
	assign,
	get Chain(): Chain1<URI> {
		return {
			URI: URI,
			chain: (ma, fab) => this.chain(fab)(ma),
			map: (ma, fab) => this.map(fab)(ma),
			ap: (fab, ma) => this.apPar(ma)(fab),
		};
	},
	get ApplyPar() {
		return {
			URI: URI,
			map: this.map,
			ap: this.apPar,
		};
	},
	get ApplySeq(): Apply1<URI> {
		return {
			URI: URI,
			map: (ma, fab) => this.map(fab)(ma),
			ap: (fab, ma) => this.apSeq(ma)(fab),
		};
	},
	get ApplicativePar(): Applicative1<URI> {
		return {
			URI: URI,
			map: (ma, fab) => this.map(fab)(ma),
			ap: (fab, ma) => this.apPar(ma)(fab),
			of: this.of,
		};
	},
	get ApplicativeSeq(): Applicative1<URI> {
		return {
			URI: URI,
			map: (ma, fab) => this.map(fab)(ma),
			ap: (fab, ma) => this.apSeq(ma)(fab),
			of: this.of,
		};
	},
};
