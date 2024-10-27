import { afterEach, describe, expect, test, vi } from 'vitest';
import invariant from 'tiny-invariant';
import { Result } from '../Utils/index.js';
import { memoryStore } from './MemoryStore.js';
import { StorageError } from '../Storage/index.js';

describe('describe memory storage', () => {
	afterEach(() => {
		vi.resetAllMocks();
	});
	test('should be able to re read contents of recently written file', async () => {
		vi.useFakeTimers();
		const now = new Date('2023-03-23');
		vi.setSystemTime(now);

		const storage = memoryStore({ pwd: '/', uri: 'MEMORY' });
		vi.advanceTimersByTime(1000 * 60);
		now.setMinutes(now.getMinutes() + 1);

		const message = 'an example message';
		await storage.write('example', message);

		const content = Result.unwrap(await storage.read('example'));
		expect(content).toEqual(message);

		const stats = Result.unwrap(await storage.stats('example'));
		expect(stats.mtime).toEqual(now);
		expect(stats.atime).toEqual(now);
		expect(stats.ctime).toEqual(now);
	});

	test('should be able to handle pathing', async () => {
		const storage = memoryStore({ pwd: '/' });
		await storage.write('/a/b/c', 'content');
		expect(await storage.read('/a/b/c')).toStrictEqual(
			Result.ok('content'),
		);
		expect(await storage.child('a/b').read('c')).toStrictEqual(
			Result.ok('content'),
		);
	});

	test('should create directories and updated modified time for parent directory when adding a new file', async () => {
		vi.useFakeTimers();
		const now = new Date('2023-03-23');
		vi.setSystemTime(now);

		const check = async (path: string, mtime: Date) => {
			const stats = Result.unwrap(await storage.stats(path));
			expect(stats.atime).toEqual(now);
			expect(stats.mtime).toEqual(mtime);
			expect(stats.ctime).toEqual(now);
		};

		const storage = memoryStore({ pwd: '/' });
		await storage.mkdir('/path/to/some/dir');

		const later = new Date('2023-03-23');
		later.setMinutes(later.getMinutes() + 1);
		vi.setSystemTime(later);

		const message = 'an example message';
		await storage.write('/path/to/some/dir/example', message);

		await check('/', now);
		await check('/path', now);
		await check('/path/to', now);
		await check('/path/to/some', now);
		await check('/path/to/some/dir', later);
	});

	test('should update access times for a file and ancestor directories when a node is read', async () => {
		vi.useFakeTimers();
		const now = new Date('2023-03-23');
		vi.setSystemTime(now);

		const check = async (path: string, atime: Date) => {
			const stats = Result.unwrap(await storage.stats(path));
			expect(stats.mtime).toEqual(now);
			expect(stats.ctime).toEqual(now);
			expect(stats.atime).toEqual(atime);
		};

		const storage = memoryStore({ pwd: '/' });
		await storage.write('/path/to/some/example', 'example text');

		const later = new Date('2023-03-23');
		later.setMinutes(later.getMinutes() + 1);
		vi.setSystemTime(later);

		await check('/path', now);
		await check('/path/to', now);
		await check('/path/to/some', now);
		await check('/path/to/some/example', now);

		await storage.read('/path/to/some/example');

		await check('/', now);
		await check('/path', now);
		await check('/path/to', now);
		await check('/path/to/some', later);
		await check('/path/to/some/example', later);
	});

	test('should be able to list the expected directories', async () => {
		const storage = memoryStore({ pwd: '/' });
		await storage.write('/path/a/a', 'file a');
		await storage.write('/path/b/b', 'file b');
		await storage.write('/path/c/c', 'file c');
		await storage.write('/path/d/d', 'file d');
		const directories = Result.unwrap(await storage.readdir('/path'));
		expect(directories).toStrictEqual(['a', 'b', 'c', 'd']);
		const childStorage = storage.child('path');
		expect(
			Result.unwrapErr(await childStorage.readdir('path')),
		).toStrictEqual(
			expect.objectContaining<Partial<StorageError.StorageError>>({
				code: 'PATH_NOT_FOUND',
			}),
		);
		expect(Result.unwrap(await childStorage.readdir('a'))).toStrictEqual([
			'a',
		]);
		expect(Result.unwrap(await childStorage.readdir(''))).toStrictEqual([
			'a',
			'b',
			'c',
			'd',
		]);
	});

	test('should create parent directories when needed', async () => {
		vi.useFakeTimers();
		const now = new Date('2023-03-23');
		vi.setSystemTime(now);

		const storage = memoryStore({ pwd: '/' });
		const message = 'an example message';
		await storage.write('/path/to/example', message);
		const content = Result.unwrap(await storage.read('/path/to/example'));
		expect(content).toEqual(message);

		{
			const files = Result.unwrap(await storage.readdir('/path/to'));
			expect(files).toStrictEqual(['example']);
		}

		{
			const files = Result.unwrap(await storage.readdir('/path'));
			expect(files).toStrictEqual(['to']);
		}

		{
			const files = Result.unwrap(await storage.readdir(''));
			expect(files).toStrictEqual(['path']);
		}
		{
			const files = Result.unwrap(await storage.readdir('/'));
			expect(files).toStrictEqual(['path']);
		}

		{
			const stats = Result.unwrap(
				await storage.stats('/path/to/example'),
			);
			invariant(stats.atime && stats.ctime && stats.mtime);
			expect(stats.isFile()).toBeTruthy();
			expect(stats.atime).toEqual(now);
			expect(stats.ctime).toEqual(now);
			expect(stats.mtime).toEqual(now);
		}

		{
			const stats = Result.unwrap(await storage.stats('/path/to'));
			expect(stats.isDirectory()).toBeTruthy();
			expect(stats.atime).toEqual(now);
			expect(stats.ctime).toEqual(now);
			expect(stats.mtime).toEqual(now);
		}

		{
			const stats = Result.unwrap(await storage.stats('/path'));
			expect(stats.isDirectory()).toBeTruthy();
			expect(stats.atime).toEqual(now);
			expect(stats.ctime).toEqual(now);
			expect(stats.mtime).toEqual(now);
		}

		{
			const stats = Result.unwrap(await storage.stats('/'));
			expect(stats.isDirectory()).toBeTruthy();
			expect(stats.atime).toEqual(now);
			expect(stats.ctime).toEqual(now);
			expect(stats.mtime).toEqual(now);
		}
	});
});
