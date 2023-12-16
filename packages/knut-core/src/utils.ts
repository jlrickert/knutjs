import { randomInt } from 'crypto';
import { NodeId } from './node';

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
}): NodeId => {
	const CHARS = '1234567890abcdefghijklmnopqrstufwqyz';
	let id = [];
	for (let i = 0; i < options.count; i++) {
		const n = randomInt(CHARS.length);
		id.push(n);
	}
	return `${options.prefix ?? ''}${id.join('')}${options.postfix ?? ''}`;
};
