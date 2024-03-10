import { Readable, Writable } from 'stream';
import { format } from 'util';
import { Future } from '@jlrickert/knutjs-core/internal/future';
import { optional } from '@jlrickert/knutjs-core/internal/optional';

export type Terminal = {
	input: Writable;
	output: Readable;
};

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
			buffer.push(chunk);
			// reader.push(chunk);
		},
	});
	return [reader, writer] as const;
};

const fmt: (
	message: any,
	...params: any[]
) => (terminal: Terminal) => Future<boolean> =
	(message, params) =>
	async ({ input }) => {
		const chunk = params ? format(message, params) : format(message);
		return input.write(chunk);
	};

const fmtLn: (
	message: any,
	...params: any[]
) => (terminal: Terminal) => Future<boolean> = (message, params) =>
	fmt(message, ...(params ? params : ['\n']));

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

const readAll: (r: Readable) => Future<string> = async (r) => {
	return new Promise((resolve) => {
		const data = r.read();
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
	pipe: _pipe,
	readAll,
	input,
	fmt,
	fmtLn,
};
