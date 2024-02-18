import { Applicative1 } from 'fp-ts/lib/Applicative.js';
import { Apply1 } from 'fp-ts/lib/Apply.js';
import { Chain1 } from 'fp-ts/lib/Chain.js';
import { Functor1 } from 'fp-ts/lib/Functor.js';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { Pointed1 } from 'fp-ts/lib/Pointed.js';
import { identity, pipe } from 'fp-ts/lib/function.js';

export type MyPromise<A> = Promise<A>;

export const URI = 'Promise';
export type URI = typeof URI;
declare module 'fp-ts/HKT' {
	interface URItoKind<A> {
		readonly [URI]: MyPromise<A>;
	}
}

export const promise = {
	of<A>(a: A): MyPromise<A> {
		return Promise.resolve(a);
	},
	ap<A>(fa: MyPromise<A>): <B>(fab: MyPromise<(a: A) => B>) => MyPromise<B> {
		return (fab) => pipe(fab, this.apPar(fa));
	},
	apSeq<A>(
		fa: MyPromise<A>,
	): <B>(fab: MyPromise<(a: A) => B>) => MyPromise<B> {
		return (fab) => {
			return pipe(
				fab,
				this.chain((f) => pipe(fa, this.map(f))),
			);
		};
	},
	apPar<A>(
		fa: MyPromise<A>,
	): <B>(fab: MyPromise<(a: A) => B>) => MyPromise<B> {
		return (fab) => {
			return Promise.all([fab, fa]).then(([f, a]) => {
				return f(a);
			});
		};
	},
	tap<A>(f: (a: A) => void): (ma: MyPromise<A>) => MyPromise<A> {
		return (ma) => {
			return pipe(
				ma,
				this.map(f),
				this.chain(() => ma),
			);
		};
	},
	flatten<A>(a: MyPromise<MyPromise<A>>): MyPromise<A> {
		return pipe(a, this.chain(identity));
	},
	map<A, B>(f: (a: A) => B): (fa: MyPromise<A>) => MyPromise<B> {
		return (fa) => {
			return fa.then(f);
		};
	},
	chain<A, B>(f: (a: A) => MyPromise<B>): (fa: MyPromise<A>) => MyPromise<B> {
		return async (fa) => {
			const r = await f(await fa);
			return r;
		};
	},
	get Do(): MyPromise<{}> {
		return this.of({});
	},
	bind<N extends string, A, B>(
		name: Exclude<N, keyof A>,
		f: (a: A) => MyPromise<B>,
	): (ma: MyPromise<A>) => MyPromise<{
		readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
	}> {
		return async (ma) => {
			const value = f(await ma);
			return Object.assign({}, await ma, { [name]: value }) as any;
		};
	},
	bindTo<N extends string>(
		name: string,
	): <A>(ma: MyPromise<A>) => MyPromise<{ readonly [K in N]: A }> {
		return (ma) => {
			return pipe(
				this.Do,
				this.bind(name, () => ma),
			) as any;
		};
	},
	get Pointed(): Pointed1<URI> {
		return { URI: URI, of: this.of };
	},
	get Functor(): Functor1<URI> {
		return {
			URI: URI,
			map: this.map as any,
		};
	},
	get Monad(): Monad1<URI> {
		return {
			URI: URI,
			of: this.of,
			chain: (ma, fab) => this.chain(fab)(ma),
			map: (ma, fab) => this.map(fab)(ma),
			ap: (fab, ma) => this.apPar(ma)(fab),
		};
	},
	get Chain(): Chain1<'Promise'> {
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
