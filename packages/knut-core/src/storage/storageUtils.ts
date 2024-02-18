import { Predicate } from 'fp-ts/lib/Predicate.js';
import { GenericStorage } from './storage.js';
import { ApiStorage } from './apiStorage.js';
import { MemoryStorage } from './memoryStorage.js';
import { FsStorage } from './fsStorage.js';
import { absurd, currentPlatform } from '../utils.js';
import { WebStorage } from './webStorage.js';
import { Optional, optional } from '../internal/optional.js';

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
