import { BaseError } from './index.js';

export type MarkdownError = BaseError.BaseError<'MARKDOWN', 'PARSE_ERR'>;

export const makeParseError = (options: BaseError.BaseErrorArgs) => {
	return BaseError.make<MarkdownError>({
		scope: 'MARKDOWN',
		code: 'PARSE_ERR',
		...options,
		message: options.message ?? 'Invalid markdown',
	});
};
