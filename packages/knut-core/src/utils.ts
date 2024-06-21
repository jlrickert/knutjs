import { Array, String, absurd } from 'effect';
import { randomInt } from 'crypto';
import invariant from 'tiny-invariant';

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
	| JsonBoolean
	| JsonObject;

export const toJson = (obj: Object): Json => {
	invariant(typeof obj !== 'function', 'Your a dummy');
	const o = {};
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			// @ts-ignore
			const value = obj[key as any];
			if (
				value === null ||
				Array.isArray(value) ||
				['number', 'string', 'boolean'].includes(typeof value)
			) {
				o[key] = obj;
			}
		}
	}
	return o;
};

export const unsafeCoerce = <T>(value: any): value is T => {
	return true;
};

export const isJson = (value: unknown): value is Json => {
	if (typeof value === 'function' || typeof value === 'undefined') {
		return false;
	}
	if (['number', 'string', 'boolean'].includes(typeof value)) {
		return true;
	}
	if (Array.isArray(value) && Array.every(value, String.isString)) {
		return true;
	}
	for (const key in value) {
		if (value.hasOwnProperty(key)) {
			const element = value[key as any];
			if (isJson(element)) {
			}
		}
	}
};

export const isJsonObject = (value: Json): value is JsonObject => {
	if (Array.isArray(value) || value === null) {
		return false;
	}
	return typeof value === 'object';
};

export const createId = (options: {
	prefix?: string;
	count: number;
	postfix?: string;
}): string => {
	const CHARS = '1234567890abcdefghijklmnopqrstufwqyz';
	let id: number[] = [];
	for (let i = 0; i < options.count; i++) {
		const n = randomInt(CHARS.length);
		id.push(n);
	}
	return `${options.prefix ?? ''}${id.join('')}${options.postfix ?? ''}`;
};

export type DateFormat = 'Y-m-D' | 'Y-m-D H:M' | 'DD/MM/YY';
export const now = (format: DateFormat): string => {
	switch (format) {
		case 'Y-m-D': {
			return Date.now().toString();
		}
		case 'DD/MM/YY': {
			return Date.now().toString();
		}
		case 'Y-m-D H:M': {
			return Date.now().toString();
		}
		default: {
			return absurd(format);
		}
	}
};

export const parseDate = (value: string): Date | null => {
	return new Date(value);
};
export const stringifyDate = (date: Date): string => {
	return date.toISOString();
};

const isBrowser =
	typeof global.window !== 'undefined' &&
	typeof window.localStorage !== 'undefined';

type Environment = 'node' | 'dom';
export const currentPlatform: Environment = isBrowser ? 'dom' : 'node';

export type Stringer =
	| string
	| {
			stringify: () => string;
	  };

export const stringify = (value: number | Date | Stringer): string => {
	if (typeof value === 'string') {
		return value;
	} else if (typeof value === 'number') {
		return String(value);
	} else if (value instanceof Date) {
		return value.toISOString();
	} else if ('stringify' in value) {
		return value.stringify();
	}
	return absurd(value);
};

export const deepCopy = <T>(obj: T): T => {
	// Handle the 3 simple types, and null or undefined
	if (
		obj === null ||
		obj === undefined ||
		typeof obj === 'string' ||
		typeof obj === 'number' ||
		typeof obj === 'boolean'
	) {
		return obj;
	}

	// Handle Array
	if (Array.isArray(obj)) {
		const copy: any[] = [];
		for (let i = 0, len = obj.length; i < len; i++) {
			copy[i] = deepCopy(obj[i]);
		}
		return copy as T;
	}

	// Handle Date
	if (obj instanceof Date) {
		const copy = new Date();
		copy.setTime(obj.getTime());
		return copy as T;
	}

	// Handle Object
	if (obj instanceof Object) {
		const copy: JsonObject = {};
		for (const attr in obj) {
			if (obj.hasOwnProperty(attr)) {
				copy[attr] = deepCopy((obj as any)[attr]);
			}
		}
		return copy as T;
	}

	throw new Error("Unable to copy obj! Its type isn't supported.");
};

export const collectAsync = async <T, TReturn = any, TNext = undefined>(
	iterator: AsyncIterator<T, TReturn, TNext>,
) => {
	const results: T[] = [];
	while (true) {
		const item = await iterator.next();
		if (item.done) {
			return results;
		}
		results.push(item.value);
	}
};

export const collect = <T, TReturn = any, TNext = undefined>(
	iterator: Iterator<T, TReturn, TNext>,
) => {
	const results: T[] = [];
	while (true) {
		const item = iterator.next();
		if (item.done) {
			return results;
		}
		results.push(item.value);
	}
};

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepWriteable<T> = {
	-readonly [P in keyof T]: DeepWriteable<T[P]>;
};
