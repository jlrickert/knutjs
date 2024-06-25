import { describe, expect, test, assert } from 'vitest';
import { pipe, Future, resultT, Result } from './index.js';

describe.concurrent('ResultT', () => {
	const T = resultT(Future.Monad);
	test('map', async () => {
		assert.deepStrictEqual(
			await pipe(
				T.ok('Welcome'),
				T.map((a) => `${a}!`),
			),
			await T.ok('Welcome!'),
		);
	});

	test('ap', async () => {
		assert.deepStrictEqual(
			await pipe(
				T.ok('a'),
				T.map((a) => (b: string) => [a, b]),
				T.ap(T.ok('b')),
			),
			await T.of(['a', 'b']),
		);
	});

	test('chain', async () => {
		const to1 = pipe(
			T.ok('foo'),
			T.chain((a) => T.ok(a.length)),
		);
		const to2 = pipe(
			T.ok('bar'),
			T.chain(() => T.err('Some error')),
		);
		const [o1, o2] = await Promise.all([to1, to2]);
		assert.deepStrictEqual(o1, Result.ok(3));
		assert.deepStrictEqual(o2, Result.err('Some error'));
	});

	test('fromNullable', async () => {
		assert.deepStrictEqual(
			await pipe(
				undefined,
				T.fromNullable(() => 'Some error'),
			),
			await T.err('Some error'),
		);
		assert.deepStrictEqual(
			await pipe(
				'Hello world',
				T.fromNullable(() => 'Some error'),
			),
			await T.ok('Hello world'),
		);
	});

	test('alt', async () => {
		assert.deepStrictEqual(
			await pipe(
				T.ok('wassup'),
				T.alt(() => T.ok('WHAT!!!')),
			),
			await T.ok('wassup'),
		);

		assert.deepStrictEqual(
			await pipe(
				T.err('wassup'),
				T.alt(() => T.ok('WHAT!!!')),
			),
			await T.ok('WHAT!!!'),
		);

		assert.deepStrictEqual(
			await pipe(
				T.err('wassup'),
				T.alt(() => T.err('second err')),
			),
			await T.err('second err'),
		);
		assert.deepStrictEqual(
			await T.alt(T.err('wassup'), () => T.err('second err')),
			await T.err('second err'),
		);
	});

	test('match', async () => {
		assert.deepStrictEqual(
			await T.match(T.ok('ok'), {
				onErr: (e) => `I got an ${e}`,
				onOk: (a) => `I got an ${a}`,
			}),
			'I got an ok',
		);

		assert.deepStrictEqual(
			await pipe(
				T.err('error'),
				T.match({
					onErr: (e) => `I got an ${e}`,
					onOk: (a) => `I got ${a}`,
				}),
			),
			'I got an error',
		);
	});

	test('filterOnErr', async () => {
		assert.deepStrictEqual(
			await pipe(
				T.ok('rawr'),
				T.filterOrErr(
					(a) => a.startsWith('r'),
					() => 'An error',
				),
			),
			await T.ok('rawr'),
		);
		assert.deepStrictEqual(
			await pipe(
				T.ok('rawr'),
				T.filterOrErr(
					(a) => !a.startsWith('r'),
					() => 'An error',
				),
			),
			await T.err('An error'),
		);

		assert.deepStrictEqual(
			await pipe(
				T.err('An error') as Future.Future<
					Result.Result<string, string>
				>,
				T.filterOrErr(
					(a) => a.startsWith('r'),
					() => 'error number 2',
				),
			),
			await T.err('An error'),
		);
	});

	test('refineOrErr', async () => {
		expect(
			await pipe(
				T.ok('rawr'),
				T.refineOrErr(
					(a): a is 'rawr' => a === 'rawr',
					() => 'An error',
				),
			),
		).toStrictEqual(await T.ok('rawr'));

		expect(
			await pipe(
				T.ok('not rawr'),
				T.refineOrErr(
					(a): a is 'rawr' => a === 'rawr',
					() => 'An error',
				),
			),
		).toStrictEqual(await T.err('An error'));

		expect(
			await pipe(
				T.err('original error') as Future.Future<
					Result.Result<string, string>
				>,
				T.refineOrErr(
					(a): a is 'rawr' => a === 'rawr',
					() => 'An error',
				),
			),
		).toStrictEqual(await T.err('original error'));
	});
});
