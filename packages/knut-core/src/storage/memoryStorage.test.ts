import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryStorage } from './memoryStorage.js';
import { stringify } from '../utils.js';

describe('describe memory storage', () => {
	afterEach(() => {
		vi.resetAllMocks();
	});
	test('should be able to re read contents of recently written file', async () => {
		vi.useFakeTimers();
		const now = new Date('2023-03-23');
		vi.setSystemTime(now);

		const storage = MemoryStorage.create();
		vi.advanceTimersByTime(1000 * 60);
		now.setMinutes(now.getMinutes() + 1);

		const message = 'an example message';
		await storage.write('example', message);

		const content = await storage.read('example');
		expect(content).toEqual(message);

		const stats = await storage.stats('example');
		expect(stats?.mtime).toEqual(stringify(now));
		expect(stats?.atime).toEqual(stringify(now));
		expect(stats?.ctime).toEqual(stringify(now));
	});

	test('should be able to handle pathing', async () => {
		const storage = MemoryStorage.create();
		await storage.write('a/b/c', 'content');
		expect(await storage.child('a/b').read('c')).toEqual('content');
	});

	test('should create directories and updated modified time for parent directory when adding a new file', async () => {
		vi.useFakeTimers();
		const now = new Date('2023-03-23');
		vi.setSystemTime(now);

		const check = async (path: string, mtime: Date) => {
			const stats = await storage.stats(path);
			expect(stats?.atime).toEqual(stringify(now));
			expect(stats?.mtime).toEqual(stringify(mtime));
			expect(stats?.ctime).toEqual(stringify(now));
		};

		const storage = MemoryStorage.create();
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
			const stats = await storage.stats(path);
			expect(stats?.mtime).toEqual(stringify(now));
			expect(stats?.ctime).toEqual(stringify(now));
			expect(stats?.atime).toEqual(stringify(atime));
		};

		const storage = MemoryStorage.create();
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
		const storage = MemoryStorage.create();
		await storage.write('/path/a/a', 'file a');
		await storage.write('/path/b/b', 'file b');
		await storage.write('/path/c/c', 'file c');
		await storage.write('/path/d/d', 'file d');
		const directories = await storage.readdir('/path');
		expect(directories).toStrictEqual([
			'path/a',
			'path/b',
			'path/c',
			'path/d',
		]);
		const childStorage = storage.child('path');
		expect(await childStorage.readdir('path')).toStrictEqual(null);
		expect(await childStorage.readdir('a')).toStrictEqual(['a/a']);
		expect(await childStorage.readdir('')).toStrictEqual([
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

		const storage = MemoryStorage.create();
		const message = 'an example message';
		await storage.write('/path/to/example', message);
		const content = await storage.read('/path/to/example');
		expect(content).toEqual(message);

		{
			const files = await storage.readdir('/path/to');
			expect(files).toStrictEqual(['path/to/example']);
		}

		{
			const files = await storage.readdir('/path');
			expect(files).toStrictEqual(['path/to']);
		}

		{
			const files = await storage.readdir('/');
			expect(files).toStrictEqual(['path']);
		}

		{
			const files = await storage.readdir('');
			expect(files).toStrictEqual(['path']);
		}

		{
			const stats = await storage.stats('/path/to/example');
			expect(stats?.isFile()).toBeTruthy();
			expect(stats?.atime).toEqual(stringify(now));
			expect(stats?.ctime).toEqual(stringify(now));
			expect(stats?.mtime).toEqual(stringify(now));
		}

		{
			const stats = await storage.stats('/path/to');
			expect(stats?.isDirectory()).toBeTruthy();
			expect(stats?.atime).toEqual(stringify(now));
			expect(stats?.ctime).toEqual(stringify(now));
			expect(stats?.mtime).toEqual(stringify(now));
		}

		{
			const stats = await storage.stats('/path');
			expect(stats?.isDirectory()).toBeTruthy();
			expect(stats?.atime).toEqual(stringify(now));
			expect(stats?.ctime).toEqual(stringify(now));
			expect(stats?.mtime).toEqual(stringify(now));
		}

		{
			const stats = await storage.stats('/');
			expect(stats?.isDirectory()).toBeTruthy();
			expect(stats?.atime).toEqual(stringify(now));
			expect(stats?.ctime).toEqual(stringify(now));
			expect(stats?.mtime).toEqual(stringify(now));
		}
	});
});
