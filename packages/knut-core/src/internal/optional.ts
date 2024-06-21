import { Monad1 } from 'fp-ts/lib/Monad.js';
import { Predicate } from 'fp-ts/lib/Predicate.js';
import { Refinement } from 'fp-ts/lib/Refinement.js';
import { PipeableTraverse1 } from 'fp-ts/lib/Traversable.js';
import { identity, pipe } from 'fp-ts/lib/function.js';

export type Some<A> = NonNullable<A>;
export type None = null | undefined;
export type TOptional<A> = Some<A> | None;

export const URI = 'Optional';
export type URI = typeof URI;
declare module 'fp-ts/HKT' {
	interface URItoKind<A> {
		readonly [URI]: TOptional<A>;
	}
}

export const none: TOptional<never> = null as TOptional<never>;

export const some: <A>(a: NonNullable<A>) => TOptional<A> = (value) => value as any;

export const of: <A>(value: A) => TOptional<A> = some as any;

export const Do: TOptional<{}> = of({});

export function isSome<A>(value: TOptional<A>): value is Some<A> {
	return value !== null && value !== undefined;
}
export function isNone<A>(value: TOptional<A>): value is None {
	return value === null || value === undefined;
}

export const fromNullable: <A>(a: A) => TOptional<NonNullable<A>> = (a) => {
	return a ?? none;
};

export const fromPredicate: <A, B extends A>(
	refinement: Refinement<A, B>,
) => (a: A) => TOptional<B> = (refinement) => (a) => {
	return refinement(a) ? some(a as any) : none;
};

export const refine: <A, B extends A>(
	refinement: Refinement<A, B>,
) => (ma: TOptional<A>) => TOptional<B> = (refinement) => (ma) => {
	return pipe(
		ma,
		optional.chain((a) => {
			return refinement(a) ? optional.some(a as any) : optional.none;
		}),
	);
};

export const filter: <A>(
	predicate: Predicate<A>,
) => (ma: TOptional<A>) => TOptional<A> = (predicate) => (ma) => {
	return pipe(
		ma,
		optional.chain((a) => {
			return predicate(a) ? optional.some(a as any) : optional.none;
		}),
	);
};

export const getOrElse: <A, B>(onNone: () => B) => (ma: TOptional<A>) => A | B =
	(onNone) => (ma) => (isSome(ma) ? (ma as any) : onNone());

export const map: <A, B>(f: (a: A) => B) => (ma: TOptional<A>) => TOptional<B> =
	(f) => (ma) => {
		return isSome(ma) ? pipe(ma, f, of) : none;
	};

export const chain: <A, B>(
	f: (a: A) => TOptional<B>,
) => (ma: TOptional<A>) => TOptional<B> = (f) => (ma) =>
	isSome(ma) ? pipe(ma, f) : none;

export const ap: <A>(
	fa: TOptional<A>,
) => <B>(fab: TOptional<(a: A) => B>) => TOptional<B> = (fa) => (fab) =>
	isSome(fa) && isSome(fab) ? of(fab(fa)) : none;

export const flap: <A>(a: A) => <B>(fab: TOptional<(a: A) => B>) => TOptional<B> =
	(a) => (fab) => (isSome(fab) ? pipe(a, fab, of) : none);

export const flatten: <A>(ma: TOptional<TOptional<A>>) => TOptional<A> = (ma) =>
	pipe(ma, chain(identity));

export const match: <A, B, C>(
	onNone: () => B,
	onSome: (a: A) => C,
) => (ma: TOptional<A>) => B | C = (onNone, onSome) => (ma) =>
	isSome(ma) ? onSome(ma) : onNone();

export const traverse: PipeableTraverse1<URI> = (F: any) => (f: any) => (ta: any) =>
	isNone(ta) ? F.of(none) : F.map(f(ta), of);

export const bind: <N extends string, A, B>(
	name: Exclude<N, keyof A>,
	f: (a: A) => TOptional<B>,
) => (ma: TOptional<A>) => TOptional<{
	[K in keyof A | N]: K extends keyof A ? A[K] : B;
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

export const bindTo: <N extends string>(
	name: N,
) => <A>(ma: TOptional<A>) => TOptional<{ [K in N]: A }> = (name) => (ma) => {
	return pipe(
		Do,
		bind(name, () => ma),
	);
};

export const Monad: Monad1<URI> = {
	URI,
	of,
	chain: (ma, fab) => chain(fab)(ma),
	map: (ma, fab) => map(fab)(ma),
	ap: (fab, ma) => ap(ma)(fab),
};

/**
 * @deprecated
 */
export const optional = {
	none,
	some,
	of,
	isSome,
	isNone,
	fromNullable,
	fromPredicate,
	getOrElse,
	flap,
	filter,
	refine,
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
