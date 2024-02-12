import { TimeLike } from 'fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryStorage } from './memoryStorage.js';
import { overwrite } from './storage.js';
import {
	TestStorageContext,
	createTestStorage,
} from '../internal/testUtils.js';

describe('storage overwrite', async () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});
	test('should update the correct time stamps', async () => {
		const a = MemoryStorage.create();
		const b = MemoryStorage.create();
		await a.write('a/b', 'some content');

		vi.advanceTimersByTime(10000);
		await overwrite(a, b);

		const now = new Date();
		const diff = (a: TimeLike, b: TimeLike) => {
			return Math.abs(new Date(a).getTime() - new Date(b).getTime());
		};

		{
			const statsA = await a.stats('a/b');
			const statsB = await b.stats('a/b');
			expect(statsA?.btime).toEqual(statsB?.btime);
			expect(statsA?.ctime).toEqual(statsB?.ctime);
			expect(statsA?.mtime).toEqual(statsB?.mtime);
			expect(statsA?.atime).toEqual(statsB?.atime);
		}

		{
			const statsA = await a.stats('a');
			const statsB = await b.stats('a');
			expect(diff(statsA?.btime!, statsB?.btime!)).toEqual(0);
			expect(diff(statsA?.ctime!, statsB?.ctime!)).toEqual(0);
			expect(diff(statsA?.mtime!, statsB?.mtime!)).toEqual(0);
			expect(diff(now, statsA?.atime!)).toBeLessThanOrEqual(
				diff(now, statsB?.atime!),
			);
		}

		{
			const statsA = await a.stats('');
			const statsB = await b.stats('');
			expect(statsA?.btime).toEqual(statsB?.btime);
			expect(statsA?.ctime).toEqual(statsB?.ctime);
			expect(statsA?.mtime).toEqual(statsB?.mtime);

			expect(diff(now, statsA?.atime!)).toBeLessThanOrEqual(
				diff(now, statsB?.atime!),
			);
		}
	});
});

describe('overwrite FsStorage', () => {
	let storageA: TestStorageContext;
	let storageB: TestStorageContext;
	beforeEach(async () => {
		storageA = await createTestStorage();
		storageB = await createTestStorage();
		vi.useFakeTimers();
	});
	afterEach(async () => {
		await storageA.reset();
		await storageB.reset();
		vi.useRealTimers();
	});

	test('should update the correct time stamps for fsStorage', async () => {
		const a = storageA.storage;
		const b = storageB.storage;
		await a.write('a/b', 'some content');

		vi.advanceTimersByTime(10000);
		await overwrite(a, b);

		const diff = (a: TimeLike, b: TimeLike) => {
			return Math.abs(new Date(a).getTime() - new Date(b).getTime());
		};

		{
			const statsA = await a.stats('a/b');
			const statsB = await b.stats('a/b');
			expect(diff(statsA?.atime!, statsB?.atime!)).toBeLessThan(20);
			expect(diff(statsA?.mtime!, statsB?.mtime!)).toBeLessThan(20);
		}
		{
			const statsA = await a.stats('a');
			const statsB = await b.stats('a');
			expect(diff(statsA?.atime!, statsB?.atime!)).toBeLessThan(20);
			expect(diff(statsA?.mtime!, statsB?.mtime!)).toBeLessThan(20);
		}

		{
			const statsA = await a.stats('');
			const statsB = await b.stats('');
			expect(diff(statsA?.atime!, statsB?.atime!)).toBeLessThan(20);
			expect(diff(statsA?.mtime!, statsB?.mtime!)).toBeLessThan(20);
		}
	});
});
