import { Storage } from '../Storage/index.js';
import { currentPlatform, Future } from '../Utils/index.js';
import { KnutErrorScopeMap } from '../Data/KnutError.js';
import { browserBackend } from './DomBackend.js';
import { FsBackend } from './FsBackend.js';
import { memoryBackend } from './MemoryBackend.js';

/**
 * keg:kegalias
 * kegalias
 * ssh:/some/path/to/root/of/keg
 * https:keg.example.com/keg/path/root
 * http:keg.example.com/keg/path/root
 * api:
 * file:
 * memory:
 */
export type Loader = (
	kegAlias: string,
) => Future.FutureResult<
	Storage.GenericStorage,
	KnutErrorScopeMap['STORAGE' | 'JSON' | 'YAML' | 'BACKEND']
>;

/**
 * Environment that knut is running in.
 */
export type Backend = {
	/**
	 * Data file system. This is safe to synchronize across systems
	 */
	data: Storage.GenericStorage;

	/**
	 * Configuration file system. This is safe to synchronize across systems
	 */
	config: Storage.GenericStorage;

	/**
	 * Device specic data. Not safe to synchronize
	 */
	state: Storage.GenericStorage;

	/**
	 * Cache file system. Non essentail data. Typically data that may be
	 * regenerated
	 */
	cache: Storage.GenericStorage;

	/**
	 * Loader loads an instance of a keg storage
	 */
	loader: Loader;
};

export const make = (impl: Backend): Backend => {
	return {
		data: impl.data,
		state: impl.state,
		cache: impl.cache,
		config: impl.config,
		loader: impl.loader,
	};
};

/**
 * Load a default backend. This could either be the browser or node. If wanting
 * to use an api as the backend see apiPlatform as an example.
 **/
export const detectBackend: () => Future.Future<Backend> = async () => {
	switch (currentPlatform) {
		case 'dom': {
			return await browserBackend();
		}
		case 'node': {
			return (await FsBackend()) ?? memoryBackend();
		}
		default: {
			return memoryBackend();
		}
	}
};
