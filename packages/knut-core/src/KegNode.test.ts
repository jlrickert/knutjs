import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestUtils } from './internal/testUtils';

TestUtils.describeEachBackend('KegNode', async ({ loadBackend }) => {
	it('should do the thing', async () => {
		const backend = await loadBackend();

		backend.loader('');
	});
});
