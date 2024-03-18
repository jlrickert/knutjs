import { Readable, Writable } from 'stream';
import { format } from 'util';
import { Future } from '@jlrickert/knutjs-core/internal/future';
import { optional } from '@jlrickert/knutjs-core/internal/optional';

export type Terminal = {
	input: Writable;
	output: Readable;
};

const make = (terminal: Terminal) => terminal;

const _pipe: () => [Readable, Writable] = () => {
	const buffer: Buffer[] = [];
	const reader = new Readable({
		read(size) {
			const data = buffer.shift();
			if (optional.isSome(data)) {
				this.push(data.toString());
			}
		},
	});
	const writer = new Writable({
		write(chunk, encoding, callback) {
			reader.push(chunk);
			callback();
		},
	});
	return [reader, writer] as const;
};

const fmt: (
	message: any,
	...params: any[]
) => (term: Terminal) => Future<boolean> =
	(message, params) =>
	async ({ input }) => {
		const chunk = params ? format(message, params) : format(message);
		// slice removes the added \n
		return input.write(chunk.slice(0, -1));
	};

const fmtLn: (
	message: any,
	...params: any[]
) => (term: Terminal) => Future<boolean> = (message, params) => {
	if (optional.isSome(params)) {
		fmt(`${message}\n`);
	}
	return fmt(`${message}\n`, params);
};

const input: (terminal: Terminal) => Future<string> = async ({ input }) => {
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

const readAll: (term: Terminal) => Future<string> = async (term) => {
	return new Promise((resolve) => {
		const data = term.output.read();
		if (data === null) {
			resolve('');
		}
		if (typeof data === 'string') {
			resolve(data);
			return;
		}
		if ('toString' in data) {
			resolve(data.toString());
		}
	});
};

export const terminal = {
	make,
	pipe: _pipe,
	readAll,
	input,
	fmt,
	fmtLn,
};
