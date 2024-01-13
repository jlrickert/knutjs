import { randomInt } from 'crypto';

export type JSONObject = { [key: string]: JSON };
export type JSONArray = JSON[];
export type JSONBoolean = boolean;
export type JSONNumber = number;
export type JSONNull = null;
export type JSONString = string;

export type JSON = JSONNull | JSONNumber | JSONString | JSONArray | JSONObject;

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
	let id = [];
	for (let i = 0; i < options.count; i++) {
		const n = randomInt(CHARS.length);
		id.push(n);
	}
	return `${options.prefix ?? ''}${id.join('')}${options.postfix ?? ''}`;
};

export const absurd = <T>(value: never): T => {
	throw new Error('This is absurd');
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

const isBrowser =
	typeof global.window !== 'undefined' &&
	typeof window.localStorage !== 'undefined';

type Environment = 'node' | 'dom';
export const currentEnvironment: Environment = isBrowser ? 'dom' : 'node';

export type Stringer = {
	stringify: () => string;
};
