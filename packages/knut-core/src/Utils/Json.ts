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
