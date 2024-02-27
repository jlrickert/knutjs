import { pipe } from 'fp-ts/lib/function.js';
import { describe, expect, it } from 'vitest';
import { optional } from './optional.js';

describe.concurrent('Optional', () => {
	it('map', () => {
		expect(
			pipe(
				optional.some(1),
				(a) => a,
				optional.map((a) => a + a),
			),
		).toStrictEqual(optional.some(2));

		expect(
			pipe(
				optional.none,
				optional.map((a) => a + a),
			),
		).toStrictEqual(optional.none);
	});

	it('chain', () => {
		expect(
			pipe(
				optional.some(1),
				optional.chain((a) => a + a),
			),
		).toStrictEqual(optional.some(2));

		expect(
			pipe(
				optional.none,
				optional.chain((a) => a + a),
			),
		).toStrictEqual(optional.none);

		expect(
			pipe(
				optional.some(1),
				optional.chain(() => optional.none),
			),
		).toStrictEqual(optional.none);
	});
});
