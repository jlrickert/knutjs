import { Kind, URIS } from 'fp-ts/HKT';
import { Monad1 } from 'fp-ts/lib/Monad.js';
import { pipe } from 'fp-ts/lib/function.js';
import { Optional, optional } from './optional.js';

export const optionalT = <M extends URIS>(M: Monad1<M>) => ({
	some<A>(a: NonNullable<A>): Kind<M, Optional<A>> {
		return pipe(a, optional.some, M.of);
	},
	alt<A>(
		second: () => Kind<M, Optional<A>>,
	): (first: Kind<M, Optional<A>>) => Kind<M, Optional<A>> {
		return (first) =>
			M.chain(first, optional.match(second, this.some as any));
	},
	zero<A extends NonNullable<any>>(): Kind<M, Optional<A>> {
		return M.of(optional.none as any);
	},
	fromNullable<A>(a: A): Kind<M, Optional<NonNullable<A>>> {
		return pipe(a, optional.fromNullable, M.of);
	},
	map<A, B>(
		f: (a: A) => B,
	): (ma: Kind<M, Optional<A>>) => Kind<M, Optional<B>> {
		return (ma) => M.map(ma, optional.map(f));
	},
	chain<A, B>(
		f: (a: A) => Kind<M, Optional<B>>,
	): (ma: Kind<M, Optional<A>>) => Kind<M, Optional<B>> {
		return (ma) =>
			M.chain(
				ma,
				optional.match(() => this.zero(), f),
			);
	},
	getOrElse<A>(
		onNone: () => Kind<M, A>,
	): (fa: Kind<M, Optional<A>>) => Kind<M, A> {
		return (ma) => M.chain(ma, optional.match(onNone, M.of));
	},
});
