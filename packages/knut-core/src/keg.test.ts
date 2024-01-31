import { describe, expect, test } from 'vitest';
import { Keg } from './keg';
import { sampleKegpath } from './internal/testUtils';
import { KegStorage, loadKegStorage } from './kegStorage';
import { MemoryStorage } from './storage/memoryStorage';
import { loadStorage } from './storage/storage';
import nodesPlugin from './plugins/nodes.plugin';

const getClonedStorage = async () => {
	const fs = loadStorage(sampleKegpath);
	const memory = await MemoryStorage.fromStorage(fs);
	const storage = KegStorage.fromStorage(memory);
	return storage;
};

describe('knut', () => {
	test('should load plugins', async () => {
		const storage = await getClonedStorage();
		const keg = await Keg.fromStorage(storage);
		const nodes = await nodesPlugin;
		nodes;
		await keg!.addPlugin(await nodesPlugin({}));
		expect(true).toBeFalsy();
	});
});
