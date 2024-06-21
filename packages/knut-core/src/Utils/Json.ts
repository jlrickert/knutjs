export type JsonObject = { [key: string]: Json };
export type JsonArray = Json[];
export type JsonBoolean = boolean;
export type JsonNumber = number;
export type JsonNull = null;
export type JsonString = string;

export type Json =
	| JsonNull
	| JsonNumber
	| JsonString
	| JsonArray
	| JsonObject;
