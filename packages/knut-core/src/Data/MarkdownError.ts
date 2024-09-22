import { BaseError } from '../Utils/index.js';

type Scope = 'MARKDOWN';
export type MarkdownParseError = BaseError.BaseError<Scope, 'PARSE_ERR'>;
export type MarkdownError = MarkdownParseError;

declare module '../Data/KnutError.js' {
	interface KnutErrorScopeMap {
		MARKDOWN: MarkdownError;
	}
}

export const makeParseError = (
	params: BaseError.BaseErrorParams<{ message: string }>,
): MarkdownError => {
	return BaseError.make<MarkdownError>({
		scope: 'MARKDOWN',
		code: 'PARSE_ERR',
		...params,
	});
};
