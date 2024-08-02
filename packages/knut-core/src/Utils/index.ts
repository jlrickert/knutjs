import { Optional } from './index.js';
import { Future } from './index.js';
import { optionalT } from './OptionalT.js';
import { resultT } from './ResultT.js';

export { absurd, pipe } from 'fp-ts/lib/function.js';

export * as Future from './Future.js';
export * as Json from './Json.js';
export * as Optional from './Optional.js';
export * as Result from './Result.js';
export { optionalT } from './OptionalT.js';
export { resultT } from './ResultT.js';
export * from './Utils.js';
export * from './Traits.js';

// TODO(jared): remove the monadic tuple crap. Just slows things down and we
// dont really use the addditional flexibility.
export const FutureResult = resultT(Future.Monad);
export const FutureOptional = optionalT(Optional.Monad);
