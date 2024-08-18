import invariant from 'tiny-invariant';
import { currentPlatform, Future, Result } from '../Utils/index.js';
import { ApiStorage } from './ApiStorage.js';
import { BaseStorage } from './BaseStorage.js';
import { MemoryStorage } from './MemoryStorage.js';
import { NodeStorage } from './NodeStorage.js';
import { WebStorage } from './WebStorage.js';

export {
	type StorageResult,
	type StorageNodeStats,
	type StorageNodeTime,
	type BaseStorage,
} from './BaseStorage.js';
export * from './ApiStorage.js';
export * from './BaseStorage.js';
export * from './MemoryStorage.js';
export * from './NodeStorage.js';
export * from './WebStorage.js';

export type GenericStorage = BaseStorage;

export const loadStorage = (path: string): BaseStorage => {
	if (path.match(/^https?/)) {
		const storage = new ApiStorage(path);
		return storage;
	}
	switch (currentPlatform) {
		case 'dom': {
			const storage = WebStorage.create();
			return storage.child(path);
		}
		case 'node': {
			const storage = new NodeStorage(path);
			return storage;
		}
		default: {
			const storage = MemoryStorage.create();
			return storage;
		}
	}
};

/**
 * copy over all contents from the source to the destination.
 */
export const overwrite = async (args: {
	source: BaseStorage;
	target: BaseStorage;
}): Future.Future<void> => {
	const { source, target } = args;
	const pathList = await source.readdir('');
	if (Result.isErr(pathList)) {
		return;
	}
	for (const path of pathList.value) {
		const stats = await source.stats(path);
		invariant(
			Result.isOk(stats),
			'Expect readdir to only list items that exist',
		);
		if (stats.value.isDirectory()) {
			await target.mkdir(path);
			await overwrite({
				source: source.child(path),
				target: target.child(path),
			});
		} else if (stats.value.isFile()) {
			const content = await source.read(path);
			invariant(
				Result.isOk(content),
				'Expect readdir to list a valid file',
			);
			await target.write(path, content.value);
		} else {
			throw new Error('Unhandled node type');
		}
	}
};
