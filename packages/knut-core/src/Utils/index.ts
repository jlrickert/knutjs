import { Optional } from './index.js';
import { Future } from './index.js';
import { optionalT } from './OptionalT.js';
import { resultT } from './ResultT.js';

export { absurd, pipe } from 'fp-ts/lib/function.js';

export * as BaseError from './BaseError.js';
export * as Future from './Future.js';
export * as Json from './Json.js';
export * as JsonError from './JsonError.js';
export * as Yaml from './Yaml.js';
export * as YamlError from './YamlError.js';
export * as Optional from './Optional.js';
export * as Result from './Result.js';
export { Markdown } from './Markdown.js';
export * as MarkdownError from './MarkdownError.js';
export { optionalT } from './OptionalT.js';
export { resultT } from './ResultT.js';
export * from './Traits.js';
export * from './Utils.js';

// TODO(jared): remove the monadic tuple crap. Just slows things down and we
// dont really use the additional flexibility.
export const FutureResult = resultT(Future.Monad);
export const FutureOptional = optionalT(Optional.Monad);
