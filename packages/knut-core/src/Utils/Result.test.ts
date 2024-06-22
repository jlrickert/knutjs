import { describe, expect, it } from 'vitest';
import { Result, pipe } from './index.js';

describe.concurrent('Result', () => {
	it('map', () => {
		expect(
			pipe(
				Result.ok(1),
				Result.map((a) => a + a),
			),
		).toStrictEqual(Result.ok(2));

		expect(
			pipe(
				Result.ok(1),
				Result.map((a) => Result.ok(a)),
			),
		).toStrictEqual(Result.ok(Result.ok));
	});

	it('chain', () => {
		expect(
			Result.chain(Result.ok(2), (a) => Result.ok(a + a)),
		).toStrictEqual(Result.ok(4));

		expect(
			Result.chain(Result.ok(2), () => Result.err('something happened')),
		).toStrictEqual(Result.err('something happened'));
	});
});
