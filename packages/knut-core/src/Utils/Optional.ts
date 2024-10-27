import invariant from 'tiny-invariant';
import { dual } from 'effect/Function';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { Predicate } from 'fp-ts/lib/Predicate.js';
import { Refinement } from 'fp-ts/lib/Refinement.js';
import { PipeableTraverse1 } from 'fp-ts/lib/Traversable.js';
import { identity, pipe } from 'fp-ts/lib/function.js';
import { Result } from './index.js';

export type Some<A> = NonNullable<A>;
export type None = null | undefined;
export type Optional<A> = Some<A> | None;

export const URI = 'Optional';
export type URI = typeof URI;
declare module 'fp-ts/HKT' {
	interface URItoKind<A> {
		readonly [URI]: Optional<A>;
	}
}

export const none: Optional<never> = null as Optional<never>;

export const some: <A>(a: NonNullable<A>) => Optional<A> = (value) =>
	value as any;

export const of: <A>(value: A) => Optional<A> = some as any;

export const Do: Optional<{}> = of({});

export function isSome<A>(value: Optional<A>): value is Some<A> {
	return value !== null && value !== undefined;
}
export function isNone<A>(value: Optional<A>): value is None {
	return value === null || value === undefined;
}

export const fromNullable: <A>(a: A) => Optional<NonNullable<A>> = (a) => {
	return a ?? none;
};

export const fromPredicate: {
	<A, B extends A>(refinement: Refinement<A, B>): (a: A) => Optional<B>;
	<A, B extends A>(a: A, refinement: Refinement<A, B>): Optional<B>;
} = dual(
	2,
	<A, B extends A>(a: A, refinement: Refinement<A, B>): Optional<B> => {
		return refinement(a) ? some(a as any) : none;
	},
);

export const fromResult = <A>(
	result: Result.Result<A, unknown>,
): Optional<A> => {
	if (Result.isOk(result)) {
		return of(result.value);
	}
	return none;
};

export const refine: {
	<A, B extends A>(
		refinement: Refinement<A, B>,
	): (ma: Optional<A>) => Optional<B>;
	<A, B extends A>(
		ma: Optional<A>,
		refinement: Refinement<A, B>,
	): Optional<B>;
} = dual(
	2,
	<A, B extends A>(
		ma: Optional<A>,
		refinement: Refinement<A, B>,
	): Optional<B> => {
		return pipe(
			ma,
			chain((a) => {
				return refinement(a) ? some(a as any) : none;
			}),
		);
	},
);

export const alt: {
	<B>(second: () => Optional<B>): <A>(first: Optional<A>) => Optional<A | B>;
	<A, B>(first: Optional<A>, second: () => Optional<B>): Optional<A | B>;
} = dual(
	2,
	<A, B>(first: Optional<A>, second: () => Optional<B>): Optional<A | B> => {
		return first ?? second();
	},
);

export const filter: {
	<A>(predicate: Predicate<A>): (ma: Optional<A>) => Optional<A>;
	<A>(ma: Optional<A>, predicate: Predicate<A>): Optional<A>;
} = dual(2, <A>(ma: Optional<A>, predicate: Predicate<A>): Optional<A> => {
	return chain(ma, (a) => {
		if (predicate(a)) {
			return of(a);
		}
		return none;
	});
});

export const getOrElse: {
	<A, B>(onNone: () => B): (ma: Optional<A>) => A | B;
	<A, B>(ma: Optional<A>, onNone: () => B): A | B;
} = dual(2, <A, B>(ma: Optional<A>, onNone: () => B): A | B => {
	return isSome(ma) ? (ma as any) : onNone();
});

export const map: {
	<A, B>(f: (a: A) => B): (ma: Optional<A>) => Optional<B>;
	<A, B>(ma: Optional<A>, f: (a: A) => B): Optional<B>;
} = dual(2, <A, B>(ma: Optional<A>, f: (a: A) => B): Optional<B> => {
	if (isSome(ma)) {
		return of(f(ma));
	}
	return ma;
});

export const chain: {
	<A, B>(f: (a: A) => Optional<B>): (ma: Optional<A>) => Optional<B>;
	<A, B>(ma: Optional<A>, f: (a: A) => Optional<B>): Optional<B>;
} = dual(2, <A, B>(ma: Optional<A>, f: (a: A) => Optional<B>): Optional<B> => {
	if (isSome(ma)) {
		return f(ma);
	}
	return none;
});

export const ap: {
	<A>(ma: Optional<A>): <B>(mab: Optional<(a: A) => B>) => Optional<B>;
	<A, B>(mab: Optional<(a: A) => B>, ma: Optional<A>): Optional<B>;
} = dual(
	2,
	<A, B>(mab: Optional<(a: A) => B>, ma: Optional<A>): Optional<B> => {
		if (isNone(ma) || isNone(mab)) {
			return none;
		}
		return of(mab(ma));
	},
);

export const flap: {
	<A>(a: A): <B>(fab: Optional<(a: A) => B>) => Optional<B>;
	<A, B>(fab: Optional<(a: A) => B>, a: A): Optional<B>;
} = dual(2, <A, B>(fab: Optional<(a: A) => B>, a: A): Optional<B> => {
	if (isSome(fab)) {
		return of(fab(a));
	}
	return none;
});

export const flatten: <A>(ma: Optional<Optional<A>>) => Optional<A> = (ma) =>
	chain(ma, identity);

export const match: {
	<A, B, C = B>(options: {
		onNone: () => B;
		onSome: (a: A) => C;
	}): (ma: Optional<A>) => B | C;
	<A, B, C = B>(
		ma: Optional<A>,
		options: {
			onNone: () => B;
			onSome: (a: A) => C;
		},
	): B | C;
} = dual(
	2,
	<A, B, C>(
		ma: Optional<A>,
		options: {
			onNone: () => B;
			onSome: (a: A) => C;
		},
	): B | C => {
		if (isSome(ma)) {
			return options.onSome(ma);
		}
		return options.onNone();
	},
);

export const traverse: PipeableTraverse1<URI> =
	(F: any) => (f: any) => (ta: any) =>
		isNone(ta) ? F.of(none) : F.map(f(ta), of);

export const bind: {
	<N extends string, A, B>(
		name: Exclude<N, keyof A>,
		f: (a: A) => Optional<B>,
	): (ma: Optional<A>) => Optional<{
		[K in keyof A | N]: K extends keyof A ? A[K] : B;
	}>;
	<N extends string, A, B>(
		ma: Optional<A>,
		name: Exclude<N, keyof A>,
		f: (a: A) => Optional<B>,
	): (ma: Optional<A>) => Optional<{
		[K in keyof A | N]: K extends keyof A ? A[K] : B;
	}>;
} = dual(3, (ma, name, f) => {
	return pipe(
		ma,
		chain((a) => {
			return pipe(
				f(a),
				map((b) => Object.assign({}, a, { [name]: b }) as any),
			);
		}),
	);
});

export const bindTo: {
	<N extends string>(
		name: N,
	): <A>(ma: Optional<A>) => Optional<{ [K in N]: A }>;
	<N extends string, A>(ma: Optional<A>, name: N): Optional<{ [K in N]: A }>;
} = dual(2, (ma, name) => {
	return pipe(
		Do,
		bind(name, () => ma),
	);
});

export const unwrap = <T>(ma: Optional<T>, message?: string): T => {
	invariant(isSome(ma), () => {
		const baseMsg = 'Programming error. Unable to unwrap an error value';
		const msg = message ? `${baseMsg}: ${message}` : baseMsg;
		const trace = new Error().stack;
		return `${msg}: ${(ma as any).error.message}\n${trace}`;
	});
	return ma;
};

export const Monad: Monad1<URI> = {
	URI,
	of,
	chain: (ma, fab) => chain(fab)(ma),
	map: (ma, fab) => map(fab)(ma),
	ap: (fab, ma) => ap(ma)(fab),
};
