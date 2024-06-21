import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestUtils } from '../internal/testUtils';
import { Keg } from '../keg';
import { DateTagPlugin } from './DateTagPlugin';

TestUtils.describeEachBackend(
	'DateTagPlugin',
	async ({ name, loadBackend }) => {
		it('should be able to read configuration', async () => {
			const backend = await loadBackend();
			const plugin = await DateTagPlugin();
			const keg = await Keg.fromBackend({
				uri: 'example1',
				backend,
				plugins: { dateTage: plugin },
			});
			keg?.config.data.
		});
	},
);
