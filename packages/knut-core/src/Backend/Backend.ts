import {
	currentPlatform,
	Future,
	Optional,
	Result,
} from '../Utils/index.js';
import { KnutConfigFile } from '../KnutConfigFile.js';
import { BackendError, KnutError } from '../Data/index.js';
import { Store } from '../Store/index.js';
import { webBackend } from './WebBackend.js';
import { fsBackend } from './FsBackend.js';
import { memoryBackend } from './MemoryBackend.js';

/**
 * Loader loads an instance of a keg storage
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
	uri: string,
) => Future.FutureResult<Store.Store, KnutError.KnutError>;

export type LoaderFactory = (params: {
	alias: string;
	uri: string;
	knutConfig: KnutConfigFile;
}) => ReturnType<Loader>;

export type BackendStorage = {
	/**
	 * Data file system. This is safe to synchronize across systems
	 */
	data: Store.Store;

	/**
	 * Configuration file system. This is safe to synchronize across systems
	 */
	config: Store.Store;

	/**
	 * Device specic data. Not safe to synchronize
	 */
	state: Store.Store;

	/**
	 * Cache file system. Non essentail data. Typically data that may be
	 * regenerated
	 */
	cache: Store.Store;
};

/**
 * Environment that knut is running in.
 */
export type Backend = BackendStorage & {
	/**
	 * Loader loads an instance of a keg storage
	 */
	loader: Loader;
};

export function make(params: {
	data: Store.Store;
	config: Store.Store;
	state: Store.Store;
	cache: Store.Store;
	loader: LoaderFactory;
}): Backend {
	const loader: Loader = async (uri) => {
		const config = await KnutConfigFile.fromBackend({
			data: params.data,
			state: params.state,
			cache: params.cache,
			config: params.config,
		});
		const definition = config.getKeg(uri);
		if (Optional.isNone(definition)) {
			return Result.err(BackendError.loaderError({ uri, config }));
		}
		if (!definition.enabled) {
			return Result.err(
				BackendError.kegNotEnabled({ alias: definition.alias }),
			);
		}
		return params.loader({
			alias: definition.alias,
			uri: definition.url,
			knutConfig: config,
		});
	};
	return {
		data: params.data,
		state: params.state,
		cache: params.cache,
		config: params.config,
		loader: loader,
	};
}

/**
 * Load a default backend. This could either be the browser or node. If wanting
 * to use an api as the backend see apiPlatform as an example.
 **/
export const detectBackend: () => Future.Future<Backend> = async () => {
	switch (currentPlatform) {
		case 'dom': {
			return await webBackend();
		}
		case 'node': {
			return (await fsBackend()) ?? memoryBackend();
		}
		default: {
			return memoryBackend();
		}
	}
};
