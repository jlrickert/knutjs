import { pipe } from 'fp-ts/lib/function.js';
import { describe, expect, it } from 'vitest';
import { Optional } from './index.js';

describe.concurrent('Optional', () => {
	it('map', () => {
		expect(
			pipe(
				Optional.some(1),
				(a) => a,
				Optional.map((a) => a + a),
			),
		).toStrictEqual(Optional.some(2));

		expect(
			pipe(
				Optional.none,
				Optional.map((a) => a + a),
			),
		).toStrictEqual(Optional.none);
	});

	it('chain', () => {
		expect(
			pipe(
				Optional.some(1),
				Optional.chain((a) => a + a),
			),
		).toStrictEqual(Optional.some(2));

		expect(
			pipe(
				Optional.none,
				Optional.chain((a) => a + a),
			),
		).toStrictEqual(Optional.none);

		expect(
			pipe(
				Optional.some(1),
				Optional.chain(() => Optional.none),
			),
		).toStrictEqual(Optional.none);
	});
});
