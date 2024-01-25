import { describe, expect, test } from 'vitest';
import { Keg } from './keg';
import { KegMemoryStorage, KegSystemStorage } from './kegStorage';
import { sampleKegpath } from './internal/testUtils';
import invariant from 'tiny-invariant';

describe('keg plugins', () => {
	test('should build a nodes.tsv file', async () => {
		const fsStorage = new KegSystemStorage({ kegpath: sampleKegpath });
		const storage = await KegMemoryStorage.copyFrom(fsStorage);
		invariant(storage, 'Expect storage to copy over without issues');
		const keg = await Keg.fromStorage(storage);
		invariant(keg, 'Expect keg to load from storage');
		await keg.update();
		const kegIndex = keg.dex.getIndex('nodes.tsv');
		expect(kegIndex?.load).toBeTruthy();
		invariant(
			kegIndex?.load,
			'Expect to be unreachable if kegIndex.load is not truthy',
		);

		const contents = await kegIndex.load();
		expect(contents).matchSnapshot('nodes.tsv');
	});
});
