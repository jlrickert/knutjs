import { pipe } from 'fp-ts/lib/function.js';
import { describe, expect, it } from 'vitest';
import { future } from './future.js';

describe.concurrent('Future', () => {
	it('map', async () => {
		expect(
			await pipe(
				future.of(1),
				future.map((a) => a + 1),
			),
		).toStrictEqual(await future.of(2));
	});

	it('chain', async () => {
		expect(
			await pipe(
				future.of(1),
				future.chain((a) => future.of(a + 1)),
			),
		).toStrictEqual(await future.of(2));
	});

	it('ap', async () => {
		const f = (s: string): number => s.length;
		expect(
			await pipe(future.of(f), future.ap(future.of('hello'))),
		).toStrictEqual(await future.of(5));
	});

	it('apSeq', async () => {
		const f = (s: string): number => s.length;
		expect(
			await pipe(future.of(f), future.apSeq(future.of('hello'))),
		).toStrictEqual(await future.of(5));
	});

	it('apPar', async () => {
		const f = (s: string): number => s.length;
		expect(
			await pipe(future.of(f), future.apPar(future.of('hello'))),
		).toStrictEqual(await future.of(5));
	});

	it('do notation', async () => {
		expect(
			await pipe(
				future.of(1),
				future.bindTo('a'),
				future.bind('b', () => future.of('b')),
				future.assign('d', ({ a, b }) => [a, b]),
			),
		).toStrictEqual({ a: 1, b: 'b', d: [1, 'b'] });
	});
});
