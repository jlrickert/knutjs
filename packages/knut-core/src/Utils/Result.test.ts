import { describe, test, expect, assert } from 'vitest';
import { Result, pipe } from './index.js';

describe.concurrent('Result', () => {
	test('map', () => {
		const table = [
			{
				actual: Result.map(Result.ok(2), (a) => a + a),
				expected: Result.ok(4),
			},
			{
				actual: pipe(
					Result.ok(2),
					Result.map((a) => a + a),
				),
				expected: Result.ok(4),
			},
			{
				actual: Result.map(Result.err('Some error'), (a) => a + a),
				expected: Result.err('Some error'),
			},
			{
				actual: pipe(
					Result.err('Some error'),
					Result.map((a) => a + a),
				),
				expected: Result.err('Some error'),
			},
		];
		for (const { actual, expected } of table) {
			expect(actual).toStrictEqual(expected);
		}
	});

	test('chain', () => {
		const table = [
			{
				actual: Result.chain(Result.ok(2), (a) => Result.ok(a + a)),
				expected: Result.ok(4),
			},
			{
				actual: Result.chain(Result.ok(2), () =>
					Result.err('Some error'),
				),
				expected: Result.err('Some error'),
			},
			{
				actual: pipe(
					Result.err('Some error') as Result.Result<number, string>,
					Result.chain((a) => Result.ok(a + a)),
				),
				expected: Result.err('Some error'),
			},
		];
		for (const { actual, expected } of table) {
			assert.deepStrictEqual(actual, expected);
		}
		expect(
			Result.chain(Result.ok(2), (a) => Result.ok(a + a)),
		).toStrictEqual(Result.ok(4));

		expect(
			pipe(
				Result.ok(2),
				Result.chain((a) => Result.ok(a + a)),
			),
		).toStrictEqual(Result.ok(4));

		expect(
			Result.chain(Result.ok(2), () => Result.err('something happened')),
		).toStrictEqual(Result.err('something happened'));
	});
});
