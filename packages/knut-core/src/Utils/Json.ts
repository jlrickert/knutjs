import { JsonError, Result } from './index.js';

export type JsonObject = { [key: string]: Json };
export type JsonArray = Json[];
export type JsonBoolean = boolean;
export type JsonNumber = number;
export type JsonNull = null;
export type JsonString = string;

export type Json = JsonNull | JsonNumber | JsonString | JsonArray | JsonObject;

export const stringify = (
	value: Json,
	options?: {
		space?: string;
	},
): string => {
	const space = options?.space;
	return JSON.stringify(value, undefined, space);
};

export const parse = <T = unknown>(
	data: string,
): Result.Result<T, JsonError.JsonError> => {
	return Result.tryCatch(
		() => JSON.parse(data) as T,
		(e) =>
			JsonError.makeParseError({
				data: e,
				message: 'Failed to parse data',
			}),
	);
};
