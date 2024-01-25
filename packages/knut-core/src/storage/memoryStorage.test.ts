import { describe, expect, test, vi } from 'vitest';
import { MemoryStorage } from './memoryStorage.js';
import { stringify } from '../utils';

describe('describe memory storage', () => {
	test('should be able to write and reread with expected stats', async () => {
		const now = new Date();
		vi.setSystemTime(now);
		const storage = MemoryStorage.create();
		const message = 'an example message';
		await storage.write('example', message);

		{
			const content = await storage.read('example');
			expect(content).toEqual(message);
		}
		{
			const content = await storage.read('/example');
			expect(content).toEqual(message);
		}

		{
			const stats = await storage.stats('example');
			expect(stats?.isFile()).toBeTruthy();
			expect(stats?.atime).toEqual(stringify(now));
			expect(stats?.ctime).toEqual(stringify(now));
			expect(stats?.mtime).toEqual(stringify(now));
		}

		{
			const stats = await storage.stats('/example');
			expect(stats?.isFile()).toBeTruthy();
			expect(stats?.atime).toEqual(stringify(now));
			expect(stats?.ctime).toEqual(stringify(now));
			expect(stats?.mtime).toEqual(stringify(now));
		}
	});
});
