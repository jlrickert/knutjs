import { Kind, URIS } from 'fp-ts/HKT';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { pipe } from 'fp-ts/lib/function.js';
import { Refinement } from 'fp-ts/lib/Refinement.js';
import * as Optional from './Optional.js';
import { Predicate } from 'fp-ts/lib/Predicate.js';

export const some: <M extends URIS>(
	M: Monad1<M>,
) => <A>(a: NonNullable<A>) => Kind<M, Optional.Optional<A>> = (M) => (a) =>
	pipe(a, Optional.some, M.of);

export const none: <M extends URIS>(
	M: Monad1<M>,
) => Kind<M, Optional.Optional<never>> = (M) =>
	M.of(Optional.none as Optional.Optional<never>);

export const alt: <M extends URIS>(
	M: Monad1<M>,
) => <B>(
	second: () => Kind<M, Optional.Optional<B>>,
) => <A>(
	first: Kind<M, Optional.Optional<A>>,
) => Kind<M, Optional.Optional<A | B>> = (M) => (second) => (first) => {
	return M.chain(first, Optional.match(second, some(M)) as any);
};

export const zero: <M extends URIS>(
	M: Monad1<M>,
) => <A>() => Kind<M, Optional.Optional<A>> = (M) => () => {
	return M.of(Optional.none as any);
};

export const fromNullable: <M extends URIS>(
	M: Monad1<M>,
) => <A>(a: A) => Kind<M, Optional.Optional<NonNullable<A>>> = (M) => (a) => {
	return pipe(a, Optional.fromNullable, M.of);
};

export const refine: <M extends URIS>(
	M: Monad1<M>,
) => <A, B extends A>(
	refinement: Refinement<A, B>,
) => (ma: Kind<M, Optional.Optional<A>>) => Kind<M, Optional.Optional<B>> =
	(M) => (refinement) => (ma) => {
		return pipe(
			ma,
			chain(M)(
				(a: any) =>
					(refinement(a) ? some(M)(a as any) : none(M)) as any,
			),
		);
	};

export const filter: <M extends URIS>(
	M: Monad1<M>,
) => <A>(
	predicate: Predicate<A>,
) => (ma: Kind<M, Optional.Optional<A>>) => Kind<M, Optional.Optional<A>> =
	(M) => (predicate) => (ma) => {
		return pipe(
			ma,
			chain(M)(
				(a: any) => (predicate(a) ? some(M)(a as any) : none(M)) as any,
			),
		);
	};

export const match: <M extends URIS>(
	M: Monad1<M>,
) => <A, B, C>(
	onNone: () => C,
	onSome: (a: A) => B,
) => (ma: Kind<M, Optional.Optional<A>>) => Kind<M, B | C> =
	(M) => (onNone, onSome) => (ma) => {
		return M.map(ma, Optional.match(onNone, onSome));
	};

export const map: <M extends URIS>(
	M: Monad1<M>,
) => <A, B>(
	f: (a: A) => B,
) => (ma: Kind<M, Optional.Optional<A>>) => Kind<M, Optional.Optional<B>> =
	(M) => (f) => (ma) => {
		return M.map(ma, Optional.map(f));
	};

export const chain: <M extends URIS>(
	M: Monad1<M>,
) => <A, B>(
	f: (a: A) => Kind<M, Optional.Optional<B>>,
) => (ma: Kind<M, Optional.Optional<A>>) => Kind<M, Optional.Optional<B>> =
	(M) => (f) => (ma) => {
		return M.chain(
			ma,
			Optional.match(() => zero(M)(), f),
		);
	};

export const ap: <M extends URIS>(
	M: Monad1<M>,
) => <A>(
	ma: Kind<M, Optional.Optional<A>>,
) => <B>(
	fab: Kind<M, Optional.Optional<(a: A) => B>>,
) => Kind<M, Optional.Optional<B>> = (M) => (ma) => (mab) => {
	const x = M.ap(
		M.map(mab, (gab) => (ga: any) => Optional.ap(ga)(gab)),
		ma,
	);
	return x;
};

export const getOrElse: <M extends URIS>(
	M: Monad1<M>,
) => <A>(
	onNone: () => Kind<M, A>,
) => (ma: Kind<M, Optional.Optional<A>>) => Kind<M, A> =
	(M) => (onNone) => (ma) => {
		return M.chain(ma, Optional.match(onNone, M.of));
	};

export const Do: <M extends URIS>(
	M: Monad1<M>,
) => Kind<M, Optional.Optional<{}>> = (M) => some(M)({});

export const bind: <M extends URIS>(
	M: Monad1<M>,
) => <N extends string, A, B>(
	name: Exclude<N, keyof A>,
	f: (a: A) => Kind<M, Optional.Optional<B>>,
) => (
	ma: Kind<M, Optional.Optional<A>>,
) => Kind<
	M,
	Optional.Optional<{
		readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
	}>
> = (M) => (name, f) => (ma) => {
	return M.chain(
		ma,
		Optional.match(
			() => zero(M)(),
			(a) => {
				const mb = f(a);
				return M.chain(
					mb,
					Optional.map(
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
	ma: Kind<M, Optional.Optional<A>>,
) => Kind<M, Optional.Optional<{ readonly [K in N]: A }>> =
	(M) => (name) => (ma) => {
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
