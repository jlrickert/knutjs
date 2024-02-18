import { Applicative1 } from 'fp-ts/lib/Applicative.js';
import { Apply1 } from 'fp-ts/lib/Apply.js';
import { Chain1 } from 'fp-ts/lib/Chain.js';
import { Functor1 } from 'fp-ts/lib/Functor.js';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { Pointed1 } from 'fp-ts/lib/Pointed.js';
import { PipeableTraverse1 } from 'fp-ts/lib/Traversable.js';
import { identity, pipe } from 'fp-ts/lib/function.js';
import invariant from 'tiny-invariant';

type Some<A> = NonNullable<A>;
type None = null;
export type Optional<A> = Some<A> | None;

export const URI = 'MyOption';
export type URI = typeof URI;
declare module 'fp-ts/HKT' {
	interface URItoKind<A> {
		readonly [URI]: Optional<A>;
	}
}

export const optional = {
	get none(): Optional<never> {
		return null;
	},
	isSome<A>(value: Optional<A>): value is Some<A> {
		return value !== null;
	},
	isNone<A>(value: Optional<A>): value is None {
		return value === null;
	},
	fromNullable<A>(a: A): Optional<NonNullable<A>> {
		return a ?? this.none;
	},
	getOrElse<A>(onNone: () => A) {
		return (ma: Optional<A>) => (this.isSome(ma) ? ma : onNone());
	},
	getOrElseW<B>(onNone: () => B) {
		return <A>(ma: Optional<A>) => (this.isSome(ma) ? ma : onNone());
	},
	flap<A>(a: A) {
		return <B>(fab: Optional<(a: A) => B>): Optional<B> => {
			if (this.isNone(fab)) {
				return this.none;
			}
			return this.of(fab(a));
		};
	},
	of<A>(a: A): Optional<A> {
		invariant(a !== null, 'Programmer error to pass in null');
		return a as any;
	},
	some<A>(a: NonNullable<A>) {
		invariant(a !== null, 'Programmer error to pass in null');
		return a as any;
	},
	ap<A>(
		fa: Optional<A>,
	): <B>(fab: Optional<(a: A) => NonNullable<B>>) => Optional<B> {
		return (fab) => {
			if (fab === null || fa === null) {
				return null;
			}
			return this.of(fab(fa));
		};
	},
	match<A, B, C>(
		onNone: () => B,
		onSome: (a: A) => C,
	): (ma: Optional<A>) => B | C {
		return (ma) => {
			return this.isSome(ma) ? onSome(ma) : onNone();
		};
	},
	flatten<A>(a: Optional<Optional<A>>): Optional<A> {
		return pipe(a, this.chain(identity));
	},
	map<A, B>(f: (a: A) => B): (fa: Optional<A>) => Optional<B> {
		return (fa) => {
			if (fa === null) {
				return null;
			}
			return this.of(f(fa));
		};
	},
	chain<A, B>(f: (a: A) => Optional<B>): (fa: Optional<A>) => Optional<B> {
		return (fa) => {
			if (this.isNone(fa)) {
				return this.none;
			}
			return f(fa);
		};
	},
	get Do(): Optional<{}> {
		return this.of({});
	},
	get traverse() {
		const x: PipeableTraverse1<URI> = (F: any) => (f: any) => (ta: any) => {
			return this.isNone(ta) ? F.of(this.none) : F.map(f(ta), this.some);
		};
		return x;
	},
	bind<N extends string, A, B>(
		name: Exclude<N, keyof A>,
		f: (a: A) => Optional<B>,
	): (ma: Optional<A>) => Optional<{
		readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
	}> {
		return (ma) => {
			if (this.isNone(ma)) {
				return this.none;
			}
			const value = f(ma);
			return Object.assign({}, ma, { [name]: value }) as any;
		};
	},
	bindTo<N extends string>(
		name: string,
	): <A>(ma: Optional<A>) => Optional<{ readonly [K in N]: A }> {
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
			ap: (fab, ma) => this.ap(ma)(fab as any),
		};
	},
	get Chain(): Chain1<URI> {
		return {
			URI: URI,
			chain: (ma, fab) => this.chain(fab)(ma),
			map: (ma, fab) => this.map(fab)(ma),
			ap: (fab, ma) => this.ap(ma)(fab as any),
		};
	},
	get Apply(): Apply1<URI> {
		return {
			URI: URI,
			map: (ma, fab) => this.map(fab)(ma),
			ap: (fab, ma) => this.ap(ma)(fab as any),
		};
	},
	get Applicative(): Applicative1<URI> {
		return {
			URI: URI,
			map: (ma, fab) => this.map(fab)(ma),
			ap: (fab, ma) => this.ap(ma)(fab as any),
			of: this.of,
		};
	},
};
