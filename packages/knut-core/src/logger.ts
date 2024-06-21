import invariant from 'tiny-invariant';
import { type JsonObject } from './utils.js';

export type Logger = {
	setLevel: (level: LogLevel) => void;
	debug: (message: string, obj: JsonObject) => void;
	info: (message: string, obj: JsonObject) => void;
	warn: (message: string, obj: JsonObject) => void;
	error: (message: string, obj: JsonObject) => void;
};

const levels = [
	'debug', // 0
	'info', // 1
	'warn', // 2
	'error', // 3
	'off', // 4
] as const;
type LogLevel = (typeof levels)[number];

export const createLogger = (level: LogLevel = 'off'): Logger => {
	let currentLogLevel = levels.indexOf(level);
	const log = (level: LogLevel) => {
		const logLevel = levels.indexOf(level);
		return (message: string, obj: JsonObject) => {
			if (currentLogLevel < logLevel) {
				return;
			}
			invariant(
				level !== 'off',
				'Expect "off" to be too high of a log level',
			);
			const stack = new Error().stack;
			const datetime = new Date().toString();
			console[level]({ message, datetime, stack, ...obj });
		};
	};
	return {
		setLevel: (level) => {
			currentLogLevel = levels.indexOf(level);
		},
		debug: log('debug'),
		info: log('info'),
		warn: log('warn'),
		error: log('error'),
	};
};
