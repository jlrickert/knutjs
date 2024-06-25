import { pipe } from 'fp-ts/lib/function.js';
import { describe, expect, test, assert } from 'vitest';
import { Optional, Future, optionalT } from './index.js';

describe.concurrent('OptionalT', () => {
	const T = optionalT(Future.Monad);
	test('map', async () => {
		expect(
			await pipe(
				T.some('Welcome'),
				T.map((a) => `${a}!`),
			),
		).toEqual('Welcome!');
	});

	test('ap', async () => {
		expect(
			await T.ap(
				T.some((a: number) => a + a),
				T.some(2),
			),
		).toStrictEqual(await T.some(4));

		assert.deepStrictEqual(
			await pipe(
				T.some('a'),
				T.map((a) => (b: string) => [a, b]),
				T.ap(T.some('b')),
			),
			await Future.of(['a', 'b']),
		);
	});

	test('chain', async () => {
		const to1 = pipe(
			T.some('foo'),
			T.chain((a) => T.some(a.length)),
		);
		const to2 = pipe(
			T.none,
			T.chain((a: string) => T.some(a.length)),
		);
		const [o1, o2] = await Promise.all([to1, to2]);
		expect(o1).toStrictEqual(Optional.some(3));
		expect(o2).toStrictEqual(Optional.none);
	});

	test('fromNullable', async () => {
		expect(await pipe(undefined, T.fromNullable)).toStrictEqual(
			Optional.none,
		);
		expect(await pipe('hello', T.fromNullable)).toStrictEqual(
			Optional.some('hello'),
		);
	});

	test('alt', async () => {
		expect(
			await pipe(
				T.some('wassup'),
				T.alt(() => T.some('WHAT!!!')),
			),
		).toStrictEqual(Optional.some('wassup'));

		expect(
			await pipe(
				T.none,
				T.alt(() => T.some('WHAT!!!')),
			),
		).toStrictEqual(Optional.some('WHAT!!!'));
		expect(
			await pipe(
				T.none,
				T.alt(() => T.none),
			),
		).toStrictEqual(Optional.none);
	});

	test('match', async () => {
		expect(
			await pipe(
				T.some('s'),
				T.match({
					onNone: () => 'I got nothing',
					onSome: (a) => `I got ${a}`,
				}),
			),
		).toStrictEqual('I got s');

		expect(
			await T.match(T.some('s'), {
				onNone: () => 'I got nothing',
				onSome: (a) => `I got ${a}`,
			}),
		).toStrictEqual('I got s');

		expect(
			await pipe(
				T.none,
				T.match({
					onNone: () => 'I got nothing',
					onSome: (a) => `I got ${a}`,
				}),
			),
		).toStrictEqual('I got nothing');

		expect(
			await T.match(T.none, {
				onNone: () => 'I got nothing',
				onSome: (a) => `I got ${a}`,
			}),
		).toStrictEqual('I got nothing');
	});

	test('getOrElse', async () => {
		expect(
			await pipe(
				T.some('ok'),
				T.getOrElse(() => Future.of('rawr')),
			),
		).toStrictEqual('ok');
		expect(
			await pipe(
				T.none,
				T.getOrElse(() => Future.of('rawr')),
			),
		).toStrictEqual('rawr');
	});

	test('filter', async () => {
		expect(
			await pipe(
				T.some('rawr'),
				T.filter((a) => !a.startsWith('r')),
			),
		).toStrictEqual(Optional.none);
		expect(
			await pipe(
				T.some('rawr'),
				T.filter((a) => a.startsWith('r')),
			),
		).toStrictEqual(Optional.some('rawr'));
	});

	test('refine', async () => {
		expect(
			await pipe(
				T.some('rawr'),
				T.filter((a) => !a.startsWith('r')),
			),
		).toStrictEqual(Optional.none);
		expect(
			await pipe(
				T.some('rawr'),
				T.filter((a) => a.startsWith('r')),
			),
		).toStrictEqual(Optional.some('rawr'));
	});
});
