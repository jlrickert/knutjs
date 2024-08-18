import { BaseError } from './index.js';

type BaseYamlError<Code extends string> = BaseError.BaseError<'YAML', Code>;

export interface YamlUknownError extends BaseYamlError<'UNKNOWN'> {}
export interface YamlParseError extends BaseYamlError<'PARSE_ERR'> {}

export type YamlError = YamlParseError | YamlUknownError;

export const makeUnknownErr = (
	options: BaseError.BaseErrorArgs,
): YamlError => {
	return BaseError.make<YamlUknownError>({
		code: 'UNKNOWN',
		scope: 'YAML',
		...options,
	});
};

export const makeParseError = (
	options: BaseError.BaseErrorArgs,
): YamlError => {
	return BaseError.make<YamlParseError>({
		code: 'PARSE_ERR',
		scope: 'YAML',
		...options,
	});
};
