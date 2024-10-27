import { BaseError } from '../Utils/index.js';

type Scope = 'JSON';
export type JsonParseError = BaseError.BaseError<Scope, 'PARSE_ERR'>;
export type JsonError = JsonParseError;

declare module './KnutError.js' {
	interface KnutErrorScopeMap {
		JSON: JsonError;
	}
}

export const makeParseError = (
	params: BaseError.BaseErrorParams<{ message: string }>,
): JsonParseError => {
	return BaseError.make<JsonParseError>({
		code: 'PARSE_ERR',
		scope: 'JSON',
		...params,
	});
};
