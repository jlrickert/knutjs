import { Kind, URIS } from 'fp-ts/HKT';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { pipe } from 'fp-ts/lib/function.js';
import { Optional, optional } from './optional.js';

const some: <M extends URIS>(
	M: Monad1<M>,
) => <A>(a: NonNullable<A>) => Kind<M, Optional<A>> = (M) => (a) =>
	pipe(a, optional.some, M.of);

const none: <M extends URIS>(M: Monad1<M>) => Kind<M, Optional<never>> = (M) =>
	M.of(optional.none as Optional<never>);

const alt: <M extends URIS>(
	M: Monad1<M>,
) => <B>(
	second: () => Kind<M, Optional<B>>,
) => <A>(first: Kind<M, Optional<A>>) => Kind<M, Optional<A | B>> =
	(M) => (second) => (first) => {
		return M.chain(first, optional.match(second, some(M)) as any);
	};

const zero: <M extends URIS>(M: Monad1<M>) => <A>() => Kind<M, Optional<A>> =
	(M) => () => {
		return M.of(optional.none as any);
	};

const fromNullable: <M extends URIS>(
	M: Monad1<M>,
) => <A>(a: A) => Kind<M, Optional<NonNullable<A>>> = (M) => (a) => {
	return pipe(a, optional.fromNullable, M.of);
};

const map: <M extends URIS>(
	M: Monad1<M>,
) => <A, B>(
	f: (a: A) => B,
) => (ma: Kind<M, Optional<A>>) => Kind<M, Optional<B>> =
	(M) => (f) => (ma) => {
		return M.map(ma, optional.map(f));
	};

const chain: <M extends URIS>(
	M: Monad1<M>,
) => <A, B>(
	f: (a: A) => Kind<M, Optional<B>>,
) => (ma: Kind<M, Optional<A>>) => Kind<M, Optional<B>> =
	(M) => (f) => (ma) => {
		return M.chain(
			ma,
			optional.match(() => zero(M)(), f),
		);
	};

const getOrElse: <M extends URIS>(
	M: Monad1<M>,
) => <A>(
	onNone: () => Kind<M, A>,
) => (ma: Kind<M, Optional<A>>) => Kind<M, A> = (M) => (onNone) => (ma) => {
	return M.chain(ma, optional.match(onNone, M.of));
};

const Do: <M extends URIS>(M: Monad1<M>) => Kind<M, Optional<{}>> = (M) =>
	some(M)({});

const bind: <M extends URIS>(
	M: Monad1<M>,
) => <N extends string, A, B>(
	name: Exclude<N, keyof A>,
	f: (a: A) => Kind<M, Optional<B>>,
) => (
	ma: Kind<M, Optional<A>>,
) => Kind<
	M,
	Optional<{ readonly [K in keyof A | N]: K extends keyof A ? A[K] : B }>
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

const bindTo: <M extends URIS>(
	M: Monad1<M>,
) => <N extends string>(
	name: N,
) => <A>(
	ma: Kind<M, Optional<A>>,
) => Kind<M, Optional<{ readonly [K in N]: A }>> = (M) => (name) => (ma) => {
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
	map: map(M),
	chain: chain(M),
	getOrElse: getOrElse(M),
	Do: Do(M),
	bind: bind(M),
	bindTo: bindTo(M),
});
