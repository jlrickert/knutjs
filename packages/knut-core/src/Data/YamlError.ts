import { BaseError } from '../Utils/index.js';

type BaseYamlError<Code extends string> = BaseError.BaseError<'YAML', Code>;

export interface YamlUknownError extends BaseYamlError<'UNKNOWN'> {}
export interface YamlParseError extends BaseYamlError<'PARSE_ERR'> {}

export type YamlError = YamlParseError | YamlUknownError;

declare module '../Data/KnutError.js' {
	interface KnutErrorScopeMap {
		YAML: YamlError;
	}
}

export const makeUnknownErr = (
	options: BaseError.BaseErrorParams<{ message: string }>,
): YamlError => {
	return BaseError.make<YamlUknownError>({
		code: 'UNKNOWN',
		scope: 'YAML',
		...options,
	});
};

export const makeParseError = (
	options: BaseError.BaseErrorParams<{ message: string }>,
): YamlError => {
	return BaseError.make<YamlParseError>({
		code: 'PARSE_ERR',
		scope: 'YAML',
		...options,
	});
};
