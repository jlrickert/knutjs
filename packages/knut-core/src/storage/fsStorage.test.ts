import { afterEach, describe, expect, test } from 'vitest';
import {
	createFilesystemContext,
	knutConfigPath,
	sampleKegpath,
} from '../internal/testUtils';
import { FsStorage } from './fsStorage';
import { MemoryStorage } from './memoryStorage';
import { GenericStorage } from './storage';

describe('file system storage', () => {
	test('should be able to resolve config paths', async () => {
		const storage = new FsStorage(knutConfigPath);
		const url = await storage.resolve('../../samplekeg');
		expect(url).toEqual(sampleKegpath);
	});

	let ctx = createFilesystemContext();

	afterEach(async () => {
		await ctx.reset();
	});

	test('should mirror the behavior of memory storage', async () => {
		const memory = MemoryStorage.create();
		const storage = new FsStorage(await ctx.getRoot());
		const check = async <K extends keyof GenericStorage>(
			key: K,
			...args: Parameters<GenericStorage[K]>
		) => {
			const a = await (memory[key] as any)(...args);
			const b = await (storage[key] as any)(...args);
			const diffDate = (a: string, b: string) => {
				return Math.abs(new Date(a).getTime() - new Date(b).getTime());
			};
			if (key === 'stats') {
				// Assuming Api will be less than 1 second to update
				expect(diffDate(a.mtime, b.mtime)).toBeLessThan(1000);
				expect(diffDate(a.atime, b.atime)).toBeLessThan(1000);
				expect(diffDate(a.btime, b.btime)).toBeLessThan(1000);
				return;
			}
			expect(a).toStrictEqual(b);
		};

		await check('utime', 'a', { mtime: new Date() });
		await check('write', 'path/to/example', 'Example');
		await check('read', 'path/to/example');
		await check('write', '/another/path/to/example', 'example');
		await check('read', '/another/path/to/example');
		await check('write', 'another/path/to/example', 'Example');
		await check('read', 'another/path/to/example');
		await check('stats', 'path/to/example');
		await check('stats', '/another/path/to/example');
		await check('stats', 'another/path/to/example');
		await check('write', 'a/a', 'Example');
		await check('write', 'a/b', 'Example');
		await check('write', 'a/c', 'Example');
		await check('write', 'b/a', 'Example');
		await check('write', 'b/b', 'Example');
		await check('write', 'b/c', 'Example');
		await check('write', 'c/a', 'Example');
		await check('write', 'c/b', 'Example');
		await check('write', 'c/c', 'Example');
		await check('readdir', 'a');
		await check('readdir', 'b');
		await check('readdir', 'c');
	});
});
