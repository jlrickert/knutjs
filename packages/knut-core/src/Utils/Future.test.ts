import { pipe } from 'fp-ts/lib/function.js';
import { describe, expect, it } from 'vitest';
import { Future } from './index.js';

describe.concurrent('Future', () => {
	it('map', async () => {
		expect(
			await pipe(
				Future.of(1),
				Future.map((a) => a + 1),
			),
		).toStrictEqual(await Future.of(2));
	});

	it('chain', async () => {
		expect(
			await pipe(
				Future.of(1),
				Future.chain((a) => Future.of(a + 1)),
			),
		).toStrictEqual(await Future.of(2));
	});

	it('ap', async () => {
		const f = (s: string): number => s.length;
		expect(
			await pipe(Future.of(f), Future.ap(Future.of('hello'))),
		).toStrictEqual(await Future.of(5));
	});

	it('apSeq', async () => {
		const f = (s: string): number => s.length;
		expect(
			await pipe(Future.of(f), Future.apSeq(Future.of('hello'))),
		).toStrictEqual(await Future.of(5));
	});

	it('apPar', async () => {
		const f = (s: string): number => s.length;
		expect(
			await pipe(Future.of(f), Future.apPar(Future.of('hello'))),
		).toStrictEqual(await Future.of(5));
	});

	it('do notation', async () => {
		expect(
			await pipe(
				Future.of(1),
				Future.bindTo('a'),
				Future.bind('b', () => Future.of('b')),
				Future.assign('d', ({ a, b }) => [a, b]),
			),
		).toStrictEqual({ a: 1, b: 'b', d: [1, 'b'] });
	});
});
