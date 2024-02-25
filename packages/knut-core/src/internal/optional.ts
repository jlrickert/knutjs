import { Monad1 } from 'fp-ts/lib/Monad.js';
import { PipeableTraverse1 } from 'fp-ts/lib/Traversable.js';
import { identity, pipe } from 'fp-ts/lib/function.js';

type Some<A> = NonNullable<A>;
type None = null | undefined;
export type Optional<A> = Some<A> | None;

export const URI = 'MyOption';
export type URI = typeof URI;
declare module 'fp-ts/HKT' {
	interface URItoKind<A> {
		readonly [URI]: Optional<A>;
	}
}

const none: Optional<never> = null;

const some: <A extends NonNullable<any>>(a: A) => Optional<A> = (value) =>
	value as any;

const of: <A>(value: A) => Optional<A> = some;

const Do: Optional<{}> = of({});

function isSome<A>(value: Optional<A>): value is Some<A> {
	return value !== null && value !== undefined;
}
function isNone<A>(value: Optional<A>): value is None {
	return value === null || value === undefined;
}

const fromNullable: <A>(a: A) => Optional<NonNullable<A>> = (a) => {
	return a ?? none;
};

const getOrElse: <A, B>(onNone: () => B) => (ma: Optional<A>) => A | B =
	(onNone) => (ma) => (isSome(ma) ? (ma as any) : onNone());

const map: <A, B>(f: (a: A) => B) => (ma: Optional<A>) => Optional<B> =
	(f) => (ma) => (isSome(ma) ? pipe(ma, f, of) : none);

const chain: <A, B>(
	f: (a: A) => Optional<B>,
) => (ma: Optional<A>) => Optional<B> = (f) => (ma) =>
	isSome(ma) ? pipe(ma, f) : none;

const ap: <A>(
	fa: Optional<A>,
) => <B>(fab: Optional<(a: A) => B>) => Optional<B> = (fa) => (fab) =>
	isSome(fa) && isSome(fab) ? of(fab(fa)) : none;

const flap: <A>(a: A) => <B>(fab: Optional<(a: A) => B>) => Optional<B> =
	(a) => (fab) => (isSome(fab) ? pipe(a, fab, of) : none);

const flatten: <A>(ma: Optional<Optional<A>>) => Optional<A> = (ma) =>
	pipe(ma, chain(identity));

const match: <A, B, C>(
	onNone: () => B,
	onSome: (a: A) => C,
) => (ma: Optional<A>) => B | C = (onNone, onSome) => (ma) =>
	isSome(ma) ? onSome(ma) : onNone();

const traverse: PipeableTraverse1<URI> = (F: any) => (f: any) => (ta: any) =>
	isNone(ta) ? F.of(none) : F.map(f(ta), of);

const bind: <N extends string, A, B>(
	name: Exclude<N, keyof A>,
	f: (a: A) => Optional<B>,
) => (ma: Optional<A>) => Optional<{
	readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
}> = (name, f) => (ma) => {
	return pipe(
		ma,
		chain((a) => {
			return pipe(
				f(a),
				map((b) => Object.assign({}, a, { [name]: b }) as any),
			);
		}),
	);
};

const bindTo: <N extends string>(
	name: N,
) => <A>(ma: Optional<A>) => Optional<{ readonly [K in N]: A }> =
	(name) => (ma) => {
		return pipe(
			Do,
			bind(name, () => ma),
		);
	};

const Monad: Monad1<URI> = {
	URI,
	of,
	chain: (ma, fab) => chain(fab)(ma),
	map: (ma, fab) => map(fab)(ma),
	ap: (fab, ma) => ap(ma)(fab),
};

export const optional = {
	none,
	some,
	of,
	isSome,
	isNone,
	fromNullable,
	getOrElse,
	flap,
	ap,
	match,
	flatten,
	map,
	chain,
	Do,
	traverse,
	bind,
	bindTo,
	Monad,
};
