import Path from 'path';
import { test, describe, expect } from 'vitest';
import { KegConfigDefinition, KnutConfigFile } from './configFile.js';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { KnutSystemStorage } from './knutStorage/index.js';
import { knutConfigPath, knutDataPath } from './internal/testUtils.js';

describe('', async () => {
	test('should be able load config file from storage', async () => {
		const cacheRoot = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
		const sampleKnutStorage = new KnutSystemStorage({
			configRoot: knutConfigPath,
			dataRoot: knutDataPath,
			cacheRoot: cacheRoot,
		});
		const config = await KnutConfigFile.fromUserConfig(sampleKnutStorage);
		expect(config.getKeg('sample')).toStrictEqual<KegConfigDefinition>({
			url: Path.resolve(
				Path.join(sampleKnutStorage.configRoot, '../../samplekeg'),
			),
			alias: 'sample',
			kegv: undefined,
		});
	});
});
