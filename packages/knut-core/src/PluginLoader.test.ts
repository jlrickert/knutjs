import { KegPlugin } from './KegPlugin/KegPlugin.js';
import { KegPluginLoader } from './KegPluginLoader.js';
import { TestUtils } from './internal/testUtils.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const examplePlugin = new KegPlugin(() => {
})

TestUtils.describeEachBackend('PluginLoader', async ({ name, loadBackend }) => {
	it('should handle middleware', async () => {
		const backend = await loadBackend()

		const loader = KegPluginLoader.fromRecord({
			example:
		})
	});
});
