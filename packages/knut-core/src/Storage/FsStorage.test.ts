import * as Path from 'path';
import { describe, expect, test } from 'vitest';
import { TestUtils } from '../Testing/index.js';
import { Result } from '../Utils/index.js';
import { MemoryStorage } from './MemoryStorage.js';
import { BaseStorage } from './BaseStorage.js';

test('path library exploration', () => {
	expect(Path.isAbsolute('/home/user/.config/knut')).toBeTruthy();
	expect(Path.isAbsolute('~/.config/knut')).toBeFalsy();
	expect(Path.isAbsolute('.config/knut')).toBeFalsy();
	expect(Path.normalize(`/home/user/.config/knut/../../repo/notes`)).toEqual(
		'/home/user/repo/notes',
	);
	expect(Path.resolve(`/home/user/.config/knut/../../repo/notes`)).toEqual(
		'/home/user/repo/notes',
	);
	expect(Path.resolve('/home/user/.config/knut', '../../repo/notes')).toEqual(
		'/home/user/repo/notes',
	);
	expect(
		Path.resolve('/home/user/.config/knut', '/home/user/repo/notes'),
	).toEqual('/home/user/repo/notes');
});

describe('file system storage', () => {
	test('should mirror the behavior of memory storage', async () => {
		const storage = await TestUtils.tempFsStorage();
		const memory = MemoryStorage.create();

		// Check if the same command is the same between node storage and memory storage
		const check = async <K extends keyof Omit<BaseStorage, 'uri' | 'storageType'>>(
			key: K,
			...args: Parameters<BaseStorage[K]>
		) => {
			const a = (await (storage[key] as any)(...args)) as any;
			const b = (await (memory[key] as any)(...args)) as any;

			const diffDate = (a: string, b: string) => {
				return Math.abs(new Date(a).getTime() - new Date(b).getTime());
			};
			if (Result.isOk(a) && Result.isOk(b) && key === 'stats') {
				const _a = a.value as any;
				const _b = b.value as any;
				// Assuming Api will be less than 1 second to update
				expect(diffDate(_a.mtime, _b.mtime)).toBeLessThan(1000);
				expect(diffDate(_a.atime, _b.atime)).toBeLessThan(1000);
				expect(diffDate(_a.btime, _b.btime)).toBeLessThan(1000);
				// file system doesn't always support ctime
				// expect(diffDate(a.ctime, b.ctime)).toBeLessThan(1000);
				return;
			}
			expect(a.value).toStrictEqual(b.value);
		};

		await check('utime', 'a', { mtime: new Date() });
		await check('write', 'path/to/example', 'Example');
		await check('read', 'path/to/example');
		await check('write', '/another/path/to/example', 'example');
		await check('read', '/another/path/to/example');
		await check('write', 'another/path/to/example', '# Example');
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
