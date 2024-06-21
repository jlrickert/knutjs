import { pipe } from 'fp-ts/lib/function.js';
import { sequenceS } from 'fp-ts/lib/Apply.js';
import {
	getUserCacheDir,
	getUserConfigDir,
	getUserVarDir,
} from './internal/systemUtils.js';
import { currentPlatform } from './utils.js';
import { StorageTrait } from './storage/index.js';
import { NodeStorage } from './storage/NodeStorage.js';
import { WebStorage } from './storage/WebStorage.js';
import { MemoryStorage } from './storage/MemoryStorage.js';
import { ApiStorage } from './storage/ApiStorage.js';
import { KegStorage } from './kegStorage.js';
import { Future, Optional } from './internal/index.js';

export type Loader = (
	uri: string,
) => Future.Future<Optional.Optional<TStorage>>;

/**
 * Environment that knut is running in.
 **/
export type TBackend = {
	/**
	 * Cache file system
	 **/

	cache: StorageTrait;
	/**
	 * Variable file system
	 **/

	variable: StorageTrait;
	/**
	 * Configuration file system
	 **/
	config: StorageTrait;

	/**
	 * Loads file system for a keg
	 **/
	loader: Loader;
};

/**
 * Node environment. This typically will be running on a workstation or server
 **/
export const nodeBackend: () => Future.Future<
	Optional.Optional<TBackend>
> = async () => {
	const cache = new NodeStorage(await getUserCacheDir()).child('knut');
	const variable = new NodeStorage(await getUserVarDir()).child('knut');
	const config = new NodeStorage(await getUserConfigDir()).child('knut');
	const loader: Loader = async (uri) => {
		const storage = new NodeStorage(uri);
		return storage;
	};
	const backend = pipe(
		sequenceS(optional.Monad)({ cache, config, variable }),
		optional.map(
			({ variable, config, cache }): TBackend => ({
				cache,
				config,
				variable,
				loader,
			}),
		),
	);
	return backend;
};

/**
 *  dom environment
 */
export const domBackend: () => Future<TBackend> = async () => {
	const storage = WebStorage.create('knut');
	const cache = storage.child('cache');
	const variable = storage.child('variables');
	const config = storage.child('config');
	const loader: Loader = async (uri: string) => {
		const storage = WebStorage.create('knut-kegs').child(uri);
		return storage;
	};
	return { loader, variable, config, cache };
};

export const memoryBackend: () => Future<TBackend> = async () => {
	const storage = MemoryStorage.create();
	const cache = storage.child('cache');
	const variable = storage.child('variables');
	const config = storage.child('config');
	const loader: Loader = async (uri: string) => {
		const store = storage.child(uri);
		return store;
	};
	return { storage, cache, config, variable, loader };
};

export const apiBackend: (uri: string) => Future<Optional<TBackend>> = async (
	rootUri,
) => {
	const storage = new ApiStorage(rootUri);
	const cache = storage.child('platform').child('cache');
	const variable = storage.child('platform').child('variables');
	const config = storage.child('platform').child('config');
	if (optional.isNone(storage)) {
		return optional.none;
	}
	const loader: Loader = async (uri) => {
		return pipe(storage.child(`${rootUri}/${uri}`), KegStorage.fromStorage);
	};
	return {
		variable,
		config,
		cache,
		loader,
	};
};

/**
 * Load a default backend. This could either be the browser or node. If wanting
 * to use an api as the backend see apiPlatform as an example.
 **/
export const detectBackend: () => Future<Optional<TBackend>> = async () => {
	switch (currentPlatform) {
		case 'dom': {
			return pipe(await domBackend(), optional.some);
		}
		case 'node': {
			return nodeBackend();
		}

		default: {
			return pipe(await memoryBackend(), optional.some);
		}
	}
};

export const backend = {
	nodeBackend,
	browserBackend: domBackend,
	memoryBackend,
	detectBackend,
	apiBackend,
};

export class Backend {
	static readonly nodeBackend = nodeBackend;
	static readonly domBackend = domBackend;
	static readonly memoryBackend = memoryBackend;
	static readonly apiBackend = apiBackend;
}
