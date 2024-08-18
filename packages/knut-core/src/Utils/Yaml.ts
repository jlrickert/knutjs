import * as YAML from 'yaml';
import { Result, YamlError } from './index.js';

export type YamlResult<T> = Result.Result<T, YamlError.YamlError>;
export const parse = <T = unknown>(data: string): YamlResult<T> => {
	return Result.tryCatch(
		() => YAML.parse(data),
		(e) => {
			return YamlError.makeParseError({
				message: 'Unable to parse input',
				error: e,
			});
		},
	);
};

export const stringify = (
	value: any,
	options?: YAML.DocumentOptions &
		YAML.SchemaOptions &
		YAML.ParseOptions &
		YAML.CreateNodeOptions &
		YAML.ToStringOptions,
) => {
	return YAML.stringify(value, options);
};
