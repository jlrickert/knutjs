import { BaseError } from './index.js';

export type JsonError = BaseError.BaseError<'JSON', 'PARSE_ERR'>;

export const makeParseError = (options: BaseError.BaseErrorArgs): JsonError => {
	return BaseError.make<JsonError>({
		code: 'PARSE_ERR',
		scope: 'JSON',
		...options,
	});
};
