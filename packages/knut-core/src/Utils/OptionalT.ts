import { dual } from 'effect/Function';
import { Kind, URIS } from 'fp-ts/HKT';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { pipe } from 'fp-ts/lib/function.js';
import { Refinement } from 'fp-ts/lib/Refinement.js';
import { Predicate } from 'fp-ts/lib/Predicate.js';
import * as Optional from './Optional.js';

const some: <M extends URIS>(
	M: Monad1<M>,
) => <A>(a: NonNullable<A>) => Kind<M, Optional.Optional<A>> = (M) => (a) =>
	M.of(Optional.some(a));

const none: <M extends URIS>(
	M: Monad1<M>,
) => Kind<M, Optional.Optional<never>> = (M) => M.of(Optional.none);

const alt: <M extends URIS>(
	M: Monad1<M>,
) => {
	<B>(
		second: () => Kind<M, Optional.Optional<B>>,
	): <A>(
		first: Kind<M, Optional.Optional<A>>,
	) => Kind<M, Optional.Optional<A | B>>;
	<A, B>(
		first: Kind<M, Optional.Optional<A>>,
		second: () => Kind<M, Optional.Optional<B>>,
	): Kind<M, Optional.Optional<A | B>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<A, B>(
			first: Kind<M, Optional.Optional<A>>,
			second: () => Kind<M, Optional.Optional<B>>,
		): Kind<M, Optional.Optional<A | B>> => {
			return M.chain(first, (a) => {
				const r = Optional.isNone(a) ? second() : M.of(a);
				return r as any;
			});
		},
	);

const zero: <M extends URIS>(
	M: Monad1<M>,
) => <A>() => Kind<M, Optional.Optional<A>> = (M) => () => {
	return M.of(Optional.none as any);
};

const fromNullable: <M extends URIS>(
	M: Monad1<M>,
) => <A>(a: A) => Kind<M, Optional.Optional<NonNullable<A>>> = (M) => (a) => {
	return pipe(a, Optional.fromNullable, M.of);
};

const refine: <M extends URIS>(
	M: Monad1<M>,
) => {
	<A, B extends A>(
		refinement: Refinement<A, B>,
	): (ma: Kind<M, Optional.Optional<A>>) => Kind<M, Optional.Optional<B>>;
	<A, B extends A>(
		ma: Kind<M, Optional.Optional<A>>,
		refinement: Refinement<A, B>,
	): Kind<M, Optional.Optional<B>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<A, B extends A>(
			ma: Kind<M, Optional.Optional<A>>,
			refinement: Refinement<A, B>,
		): Kind<M, Optional.Optional<B>> => {
			return M.map(ma, (a) => {
				return Optional.refine(a, refinement);
			});
		},
	);

const filter: <M extends URIS>(
	M: Monad1<M>,
) => {
	<A>(
		predicate: Predicate<A>,
	): (ma: Kind<M, Optional.Optional<A>>) => Kind<M, Optional.Optional<A>>;
	<A>(
		ma: Kind<M, Optional.Optional<A>>,
		refinement: Predicate<A>,
	): Kind<M, Optional.Optional<A>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<A>(
			ma: Kind<M, Optional.Optional<A>>,
			predicate: Predicate<A>,
		): Kind<M, Optional.Optional<A>> => {
			return M.map(ma, (a) => {
				return Optional.filter(a, predicate);
			});
		},
	);

const match: <M extends URIS>(
	M: Monad1<M>,
) => {
	<A, B, C>(options: {
		onNone: () => C;
		onSome: (a: A) => B;
	}): (ma: Kind<M, Optional.Optional<A>>) => Kind<M, B | C>;
	<A, B, C>(
		ma: Kind<M, Optional.Optional<A>>,
		options: {
			onNone: () => C;
			onSome: (a: A) => B;
		},
	): Kind<M, B | C>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<A, B, C>(
			ma: Kind<M, Optional.Optional<A>>,
			options: { onNone: () => C; onSome: (a: A) => B },
		): Kind<M, B | C> => {
			const r = M.map(ma, (a) => {
				return Optional.match(a, options);
			});
			return r;
		},
	);

const map: <M extends URIS>(
	M: Monad1<M>,
) => {
	<A, B>(
		f: (a: A) => B,
	): (ma: Kind<M, Optional.Optional<A>>) => Kind<M, Optional.Optional<B>>;
	<A, B>(
		ma: Kind<M, Optional.Optional<A>>,
		f: (a: A) => B,
	): Kind<M, Optional.Optional<B>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<A, B>(
			ma: Kind<M, Optional.Optional<A>>,
			f: (a: A) => B,
		): Kind<M, Optional.Optional<B>> => {
			return M.map(ma, Optional.map(f));
		},
	);

const chain: <M extends URIS>(
	M: Monad1<M>,
) => {
	<A, B>(
		f: (a: A) => Kind<M, Optional.Optional<B>>,
	): (ma: Kind<M, Optional.Optional<A>>) => Kind<M, Optional.Optional<B>>;
	<A, B>(
		ma: Kind<M, Optional.Optional<A>>,
		f: (a: A) => Kind<M, Optional.Optional<B>>,
	): Kind<M, Optional.Optional<B>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<A, B>(
			ma: Kind<M, Optional.Optional<A>>,
			f: (a: A) => Kind<M, Optional.Optional<B>>,
		): Kind<M, Optional.Optional<B>> => {
			return M.chain(ma, (a) => {
				const r = Optional.match(a, {
					onNone: () => zero(M)(),
					onSome: (value) => f(value) as any,
				});
				return r;
			});
		},
	);

const ap: <M extends URIS>(
	M: Monad1<M>,
) => {
	<A>(
		ma: Kind<M, Optional.Optional<A>>,
	): <B>(
		mab: Kind<M, Optional.Optional<(a: A) => B>>,
	) => Kind<M, Optional.Optional<B>>;
	<A, B>(
		mab: Kind<M, Optional.Optional<(a: A) => B>>,
		ma: Kind<M, Optional.Optional<A>>,
	): Kind<M, Optional.Optional<B>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<A, B>(
			mab: Kind<M, Optional.Optional<(a: A) => B>>,
			ma: Kind<M, Optional.Optional<B>>,
		): Kind<M, Optional.Optional<B>> => {
			return M.ap(
				M.map(mab, (gab) => (ga: any) => Optional.ap(gab, ga)),
				ma,
			);
		},
	);

const getOrElse: <M extends URIS>(
	M: Monad1<M>,
) => {
	<A, B = A>(
		onNone: () => Kind<M, B>,
	): (ma: Kind<M, Optional.Optional<A>>) => Kind<M, A | B>;
	<A, B = A>(
		ma: Kind<M, Optional.Optional<A>>,
		onNone: () => Kind<M, B>,
	): Kind<M, A | B>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<A, B>(
			ma: Kind<M, Optional.Optional<A>>,
			onNone: () => B,
		): Kind<M, A | B> => {
			const r = M.map(ma, (a) => Optional.getOrElse(a, () => onNone()));
			return r;
		},
	);

const Do: <M extends URIS>(M: Monad1<M>) => Kind<M, Optional.Optional<{}>> = (
	M,
) => some(M)({});

const bind: <M extends URIS>(
	M: Monad1<M>,
) => {
	<N extends string, A, B>(
		name: Exclude<N, keyof A>,
		f: (a: A) => Kind<M, Optional.Optional<B>>,
	): (ma: Kind<M, Optional.Optional<A>>) => Kind<
		M,
		Optional.Optional<{
			readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
		}>
	>;
	<N extends string, A, B>(
		ma: Kind<M, Optional.Optional<A>>,
		name: Exclude<N, keyof A>,
		f: (a: A) => Kind<M, Optional.Optional<B>>,
	): Kind<
		M,
		Optional.Optional<{
			readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
		}>
	>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		3,
		<N extends string, A, B>(
			ma: Kind<M, Optional.Optional<A>>,
			name: Exclude<N, keyof A>,
			f: (a: A) => Kind<M, Optional.Optional<B>>,
		): Kind<
			M,
			Optional.Optional<{
				readonly [K in keyof A | N]: K extends keyof A ? A[K] : B;
			}>
		> => {
			return M.chain(ma, (a) =>
				Optional.match(a, {
					onNone: () => zero(M)(),
					onSome: (value) => {
						const mb = f(value);
						return M.chain(
							mb,
							Optional.map(
								(b) =>
									Object.assign({}, value, {
										[name]: b,
									}) as any,
							),
						);
					},
				}),
			);
		},
	);

const bindTo: <M extends URIS>(
	M: Monad1<M>,
) => {
	<N extends string>(
		name: N,
	): <A>(
		ma: Kind<M, Optional.Optional<A>>,
	) => Kind<M, Optional.Optional<{ readonly [K in N]: A }>>;
	<N extends string, A>(
		ma: Kind<M, Optional.Optional<A>>,
		name: N,
	): Kind<M, Optional.Optional<{ readonly [K in N]: A }>>;
} = <M extends URIS>(M: Monad1<M>) =>
	dual(
		2,
		<N extends string, A>(
			ma: Kind<M, Optional.Optional<A>>,
			name: N,
		): Kind<M, Optional.Optional<{ readonly [K in N]: A }>> => {
			return pipe(
				Do(M),
				bind(M)(name, () => ma),
			) as any;
		},
	);

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
