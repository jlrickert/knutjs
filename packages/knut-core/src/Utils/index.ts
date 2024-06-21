import { absurd } from 'fp-ts/lib/function.js';

export * as Optional from './Optional.js';
export * as Future from './Future.js';
export * as OptionalT from './OptionalT.js';
export * as Json from './Json.js';
export * from './Traits.js';

export const unsafeCoerce = <T>(value: any): value is T => {
	return true;
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
