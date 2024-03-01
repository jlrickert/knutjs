import { Readable, Writable } from 'stream';
import { format } from 'util';
import { Future } from '@jlrickert/knutjs-core/internal/future';
import { Reader, asks, tap } from 'fp-ts/lib/Reader.js';
import {
	Platform,
	PlatformEnv,
	platform,
} from '@jlrickert/knutjs-core/program.js';
import { flow, pipe } from 'fp-ts/lib/function.js';
import { reader } from 'fp-ts';

export type TerminalEnv = {
	input: Writable;
	output: Readable;
};

export type Terminal<T> = Reader<TerminalEnv, T>;

const program = pipe(
	reader.Do,
	reader.bind('platform', () => reader.of<PlatformEnv>({ storage })),
);

const inputContext: Readable[] = [process.stdin];
const outputContext: Writable[] = [process.stdout];

const getWriter: Terminal<Writable> = () =>
	outputContext[outputContext.length - 1];
const getReader = () => inputContext[inputContext.length - 1];

const withInput: (
	reader: Readable,
) => <F extends (...params: any[]) => Future<any>>(f: F) => F =
	(reader) =>
	(f): any =>
	async (...args: any[]) => {
		inputContext.push(reader);
		const output = await f(...args);
		inputContext.pop();
		return output;
	};

const withOutput: (
	writer: Writable,
) => <F extends (...params: unknown[]) => Future<unknown>>(f: F) => F =
	(writer) =>
	(f): any =>
	async (...args: any[]) => {
		outputContext.push(writer);
		const output = await f(...args);
		outputContext.pop();
		return output;
	};

const _pipe: () => [Readable, Writable] = () => {
	const buffer: Buffer[] = [];
	const reader = new Readable({
		read(size) {
			const data = buffer.shift();
			this.push(data?.toString());
		},
	});
	const writer = new Writable({
		write(chunk, encoding, callback) {
			buffer.push(chunk);
			reader.push(chunk);
		},
	});
	return [reader, writer] as const;
};

const fmt: (message: any, ...params: any[]) => Future<boolean> = async (
	message,
	params,
) => {
	const chunk = params ? format(message, params) : format(message);
	const stream = getWriter();
	return stream.write(chunk);
};

const fmtLn: (message: any, ...params: any[]) => Future<boolean> = async (
	message,
	params,
) => {
	return fmt(message, ...(params ? params : ['\n']));
};

const userInput: () => Future<string> = async () => {
	const input = getReader();
	return new Promise((resolve) => {
		const data: string[] = [];
		input.on('data', (chunk) => {
			data.push(chunk);
		});
		input.on('close', () => {
			resolve(data.join(''));
		});
	});
};

export const terminal = {
	pipe: _pipe,
	withInput,
	withOutput,
	userInput,
	fmt,
	fmtLn,
};
