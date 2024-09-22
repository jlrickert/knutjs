import { BaseError } from '../Utils/index.js';

type Scope = 'JSON';
export type JsonParseError = BaseError.BaseError<Scope, 'PARSE_ERR'>;
export type JsonError = JsonParseError;

declare module '../Data/KnutError.js' {
	interface KnutErrorScopeMap {
		JSON: JsonError;
	}
}

export const makeParseError = (
	options: BaseError.BaseErrorArgs,
): JsonParseError => {
	return BaseError.make<JsonParseError>({
		code: 'PARSE_ERR',
		scope: 'JSON',
		...options,
	});
};
