import { describe, test } from 'vitest';
import { searchCli } from './searchCli.js';
import { sampleKegpath } from '@jlrickert/knutjs-core/internal/testUtils.js';

describe('search cli', () => {
	test('should find the thing', async () => {
		searchCli.parse(['-kp', sampleKegpath]);
	});
});
