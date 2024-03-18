import { randomInt } from 'crypto';
import { absurd } from 'fp-ts/lib/function.js';

export type JSONObject = { [key: string]: MY_JSON };
export type JSONArray = MY_JSON[];
export type JSONBoolean = boolean;
export type JSONNumber = number;
export type JSONNull = null;
export type JSONString = string;

export type MY_JSON =
	| JSONNull
	| JSONNumber
	| JSONString
	| JSONArray
	| JSONObject;

export let _nowHack = () => new Date().toISOString();

export const currentDate = () => {
	return _nowHack();
};

export const unsafeCoerce = <T>(value: any): value is T => {
	return true;
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
		const copy: JSONObject = {};
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

export const collect = async <T, TReturn = any, TNext = undefined>(
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
