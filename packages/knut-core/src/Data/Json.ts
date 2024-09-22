import { JsonError, KnutError } from './index.js';
import { Result } from '../Utils/index.js';

export type JsonObject = { [key: string]: Json };
export type JsonArray = Json[];
export type JsonBoolean = boolean;
export type JsonNumber = number;
export type JsonNull = null;
export type JsonString = string;

export type Json =
	| JsonNull
	| JsonNumber
	| JsonBoolean
	| JsonString
	| JsonArray
	| JsonObject;

export type JsonStringifyOptions = {
	space?: string;
};
export const stringify = (
	value: Json,
	options?: JsonStringifyOptions,
): string => {
	const space = options?.space;
	return JSON.stringify(value, undefined, space);
};

export type JsonResult<T> = Result.Result<
	T,
	KnutError.KnutErrorScopeMap['JSON']
>;

export const parse = <T = unknown>(data: string): JsonResult<T> => {
	return Result.tryCatch(
		() => JSON.parse(data) as T,
		(e) =>
			JsonError.makeParseError({
				data: e,
				message: 'Failed to parse data',
			}),
	);
};
