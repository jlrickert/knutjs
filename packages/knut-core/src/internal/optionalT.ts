import { Kind, URIS } from 'fp-ts/HKT';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { pipe } from 'fp-ts/lib/function.js';
import { Refinement } from 'fp-ts/lib/Refinement.js';
import { TOptional, optional } from './optional.js';
import { Predicate } from 'fp-ts/lib/Predicate.js';

export const some: <M extends URIS>(
	M: Monad1<M>,
) => <A>(a: NonNullable<A>) => Kind<M, TOptional<A>> = (M) => (a) =>
	pipe(a, optional.some, M.of);

export const none: <M extends URIS>(M: Monad1<M>) => Kind<M, TOptional<never>> = (M) =>
	M.of(optional.none as TOptional<never>);

export const alt: <M extends URIS>(
	M: Monad1<M>,
) => <B>(
	second: () => Kind<M, TOptional<B>>,
) => <A>(first: Kind<M, TOptional<A>>) => Kind<M, TOptional<A | B>> =
	(M) => (second) => (first) => {
		return M.chain(first, optional.match(second, some(M)) as any);
	};

export const zero: <M extends URIS>(M: Monad1<M>) => <A>() => Kind<M, TOptional<A>> =
	(M) => () => {
		return M.of(optional.none as any);
	};

export const fromNullable: <M extends URIS>(
	M: Monad1<M>,
) => <A>(a: A) => Kind<M, TOptional<NonNullable<A>>> = (M) => (a) => {
	return pipe(a, optional.fromNullable, M.of);
};

export const refine: <M extends URIS>(
	M: Monad1<M>,
) => <A, B extends A>(
	refinement: Refinement<A, B>,
) => (ma: Kind<M, TOptional<A>>) => Kind<M, TOptional<B>> =
	(M) => (refinement) => (ma) => {
		return pipe(
			ma,
			chain(M)(
				(a) => (refinement(a) ? some(M)(a as any) : none(M)) as any,
			),
		);
	};

export const filter: <M extends URIS>(
	M: Monad1<M>,
) => <A>(
	predicate: Predicate<A>,
) => (ma: Kind<M, TOptional<A>>) => Kind<M, TOptional<A>> =
	(M) => (predicate) => (ma) => {
		return pipe(
			ma,
			chain(M)(
				(a) => (predicate(a) ? some(M)(a as any) : none(M)) as any,
			),
		);
	};

export const match: <M extends URIS>(
	M: Monad1<M>,
) => <A, B, C>(
	onNone: () => C,
	onSome: (a: A) => B,
) => (ma: Kind<M, TOptional<A>>) => Kind<M, B | C> =
	(M) => (onNone, onSome) => (ma) => {
		return M.map(ma, optional.match(onNone, onSome));
	};

export const map: <M extends URIS>(
	M: Monad1<M>,
) => <A, B>(
	f: (a: A) => B,
) => (ma: Kind<M, TOptional<A>>) => Kind<M, TOptional<B>> =
	(M) => (f) => (ma) => {
		return M.map(ma, optional.map(f));
	};

export const chain: <M extends URIS>(
	M: Monad1<M>,
) => <A, B>(
	f: (a: A) => Kind<M, TOptional<B>>,
) => (ma: Kind<M, TOptional<A>>) => Kind<M, TOptional<B>> =
	(M) => (f) => (ma) => {
		return M.chain(
			ma,
			optional.match(() => zero(M)(), f),
		);
	};

export const ap: <M extends URIS>(
	M: Monad1<M>,
) => <A>(
	ma: Kind<M, TOptional<A>>,
) => <B>(fab: Kind<M, TOptional<(a: A) => B>>) => Kind<M, TOptional<B>> =
	(M) => (ma) => (mab) => {
		const x = M.ap(
			M.map(mab, (gab) => (ga: any) => optional.ap(ga)(gab)),
			ma,
		);
		return x;
	};

export const getOrElse: <M extends URIS>(
	M: Monad1<M>,
) => <A>(
	onNone: () => Kind<M, A>,
) => (ma: Kind<M, TOptional<A>>) => Kind<M, A> = (M) => (onNone) => (ma) => {
	return M.chain(ma, optional.match(onNone, M.of));
};

export const Do: <M extends URIS>(M: Monad1<M>) => Kind<M, TOptional<{}>> = (M) =>
	some(M)({});

export const bind: <M extends URIS>(
	M: Monad1<M>,
) => <N extends string, A, B>(
	name: Exclude<N, keyof A>,
	f: (a: A) => Kind<M, TOptional<B>>,
) => (
	ma: Kind<M, TOptional<A>>,
) => Kind<
	M,
	TOptional<{ readonly [K in keyof A | N]: K extends keyof A ? A[K] : B }>
> = (M) => (name, f) => (ma) => {
	return M.chain(
		ma,
		optional.match(
			() => zero(M)(),
			(a) => {
				const mb = f(a);
				return M.chain(
					mb,
					optional.map(
						(b) => Object.assign({}, a, { [name]: b }) as any,
					),
				);
			},
		),
	);
};

export const bindTo: <M extends URIS>(
	M: Monad1<M>,
) => <N extends string>(
	name: N,
) => <A>(
	ma: Kind<M, TOptional<A>>,
) => Kind<M, TOptional<{ readonly [K in N]: A }>> = (M) => (name) => (ma) => {
	return pipe(
		Do(M),
		bind(M)(name, () => ma),
	) as any;
};

export const optionalT = <M extends URIS>(M: Monad1<M>) => ({
	some: some(M),
	none: none(M),
	alt: alt(M),
	zero: zero(M),
	fromNullable: fromNullable(M),
	refine: refine(M),
	filter: filter(M),
	match: match(M),
	ap: ap(M),
	map: map(M),
	chain: chain(M),
	getOrElse: getOrElse(M),
	Do: Do(M),
	bind: bind(M),
	bindTo: bindTo(M),
});
