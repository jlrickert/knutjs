import { pipe } from 'fp-ts/lib/function.js';
import { describe, expect, test } from 'vitest';
import { optional } from './optional.js';
import { optionalT } from './optionalT.js';
import { future } from './future.js';

describe.concurrent('OptionalT', () => {
	const T = optionalT(future.Monad);
	test('map', async () => {
		const greeting = T.some('Welcome');
		const excitingGreeting = await pipe(
			greeting,
			T.map((a) => a + '!'),
		);
		expect(excitingGreeting).toEqual('Welcome!');
	});

	test('ap', async () => {
		const a = T.some('a');
		const b = T.some('b');
		expect(
			pipe(
				a,
				T.map((a) => (b: string) => [a, b]),
				T.ap(b),
			),
		).toStrictEqual(future.of(['a', 'b']));
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
		expect(o1).toStrictEqual(optional.some(3));
		expect(o2).toStrictEqual(optional.none);
	});

	test('alt', async () => {
		expect(
			await pipe(
				T.some('wassup'),
				T.alt(() => T.some('WHAT!!!')),
			),
		).toStrictEqual(optional.some('wassup'));

		expect(
			await pipe(
				T.none,
				T.alt(() => T.some('WHAT!!!')),
			),
		).toStrictEqual(optional.some('WHAT!!!'));
		expect(
			await pipe(
				T.none,
				T.alt(() => T.none),
			),
		).toStrictEqual(optional.none);
	});

	test('match', async () => {
		expect(
			await pipe(
				T.some('s'),
				T.match(
					() => 'I got nothing',
					(a) => `I got ${a}`,
				),
			),
		).toStrictEqual('I got s');

		expect(
			await pipe(
				T.none,
				T.match(
					() => 'I got nothing',
					(a) => `I got ${a}`,
				),
			),
		).toStrictEqual('I got nothing');
	});

	test('getOrElse', async () => {
		expect(
			await pipe(
				T.some('ok'),
				T.getOrElse(() => 'rawr'),
			),
		).toStrictEqual('ok');
		expect(
			await pipe(
				T.none,
				T.getOrElse(() => 'rawr'),
			),
		).toStrictEqual('rawr');
	});

	test('filter', async () => {
		expect(
			await pipe(
				T.some('rawr'),
				T.filter((a) => !a.startsWith('r')),
			),
		).toStrictEqual(optional.none);
		expect(
			await pipe(
				T.some('rawr'),
				T.filter((a) => a.startsWith('r')),
			),
		).toStrictEqual(optional.some('rawr'));
	});

	test('refine', async () => {
		expect(
			await pipe(
				T.some('rawr'),
				T.filter((a) => !a.startsWith('r')),
			),
		).toStrictEqual(optional.none);
		expect(
			await pipe(
				T.some('rawr'),
				T.filter((a) => a.startsWith('r')),
			),
		).toStrictEqual(optional.some('rawr'));
	});
});
