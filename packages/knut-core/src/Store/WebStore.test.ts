import { describe, test } from 'vitest';
import { TestUtils } from '../Testing/index.js';
import { MemoryStore } from './index.js';
import { expectSameBehavior } from './StoreTestUtils.js';

describe('File System Store', () => {
	test('should mirror the behaviior of memory storage', async () => {
		const storage = await TestUtils.testWebStore();
		const memory = MemoryStore.memoryStore();

		await expectSameBehavior(memory, storage);
	});
});
