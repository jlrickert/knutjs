import { Predicate } from 'fp-ts/lib/Predicate.js';
import { GenericStorage } from './storage.js';
import { ApiStorage } from './apiStorage.js';
import { MemoryStorage } from './memoryStorage.js';
import { FsStorage } from './fsStorage.js';
import { absurd, currentPlatform } from '../utils.js';
import { WebStorage } from './webStorage.js';
import { Optional, optional } from '../internal/optional.js';
import invariant from 'tiny-invariant';

const isHTTPSUri: Predicate<string> = (uri) =>
	uri.startsWith('http://') || uri.startsWith('https://');

const isMemory: Predicate<string> = (uri) => uri === ':memory:';

const isFile: Predicate<string> = (uri) => uri.startsWith('file://');

export const fromUri = (uri: string): Optional<GenericStorage> => {
	switch (true) {
		case isHTTPSUri(uri): {
			return optional.some(new ApiStorage(uri));
		}
		case isMemory(uri): {
			return optional.some(MemoryStorage.create());
		}
		case isFile(uri): {
			return optional.some(new FsStorage(uri));
		}

		case currentPlatform === 'node': {
			return optional.some(new FsStorage(uri));
		}

		case currentPlatform === 'dom': {
			return optional.some(WebStorage.create());
		}

		default: {
			return absurd(currentPlatform);
		}
	}
};

export const loadStorage = (path: string): GenericStorage => {
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
			const storage = new FsStorage(path);
			return storage;
		}
		default: {
			const storage = MemoryStorage.create();
			return storage;
		}
	}
};

export const walk = async (
	storage: GenericStorage,
	f: (dirs: string[], files: string[]) => void,
): Promise<void> => {
	const item = storage.readdir('/');
};

/**
 * copy over all contents from the source to the destination.
 */
export const overwrite = async (src: GenericStorage, dest: GenericStorage) => {
	const pathList = await src.readdir('');
	if (!pathList) {
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

/**
 * Makes the destination look like the source
 */
export const archive = async (src: GenericStorage, dest: GenericStorage) => {};
