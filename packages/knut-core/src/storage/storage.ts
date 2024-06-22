import invariant from 'tiny-invariant';
import { currentPlatform, Future, Optional } from '../Utils/index.js';
import { ApiStorage } from './ApiStorage.js';
import { BaseStorage } from './BaseStorage.js';
import { MemoryStorage } from './MemoryStorage.js';
import { NodeStorage } from './NodeStorage.js';
import { WebStorage } from './WebStorage.js';

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
export const overwrite = async (
	src: BaseStorage,
	dest: BaseStorage,
): Future.Future<void> => {
	const pathList = await src.readdir('');
	if (Optional.isNone(pathList)) {
		return;
	}
	for (const path of pathList) {
		const stats = await src.stats(path);
		invariant(stats, 'Expect readdir to only list items that exist');
		if (stats.isDirectory()) {
			await dest.mkdir(path);
			await overwrite(src.child(path), dest.child(path));
		} else if (stats.isFile()) {
			const content = await src.read(path);
			invariant(content, 'Expect readdir to list a valid file');
			await dest.write(path, content);
		} else {
			throw new Error('Unhandled node type');
		}
	}
};
