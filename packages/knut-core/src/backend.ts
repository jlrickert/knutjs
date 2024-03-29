import { pipe } from 'fp-ts/lib/function.js';
import { sequenceS } from 'fp-ts/lib/Apply.js';
import { Optional, optional } from './internal/optional.js';
import { Future } from './internal/future.js';
import {
	getUserCacheDir,
	getUserConfigDir,
	getUserVarDir,
} from './internal/systemUtils.js';
import { currentPlatform } from './utils.js';
import { GenericStorage } from './storage/storage.js';
import { NodeStorage } from './storage/nodeStorage.js';
import { WebStorage } from './storage/webStorage.js';
import { MemoryStorage } from './storage/memoryStorage.js';
import { ApiStorage } from './storage/apiStorage.js';
import { KegStorage } from './kegStorage.js';

export type Loader = (uri: string) => Future<Optional<GenericStorage>>;

/**
 * Environment that knut is running in.
 **/
export type Backend = {
	/**
	 * Cache file system
	 **/

	cache: GenericStorage;
	/**
	 * Variable file system
	 **/

	variable: GenericStorage;
	/**
	 * Configuration file system
	 **/
	config: GenericStorage;

	/**
	 * Loads file system for a keg
	 **/
	loader: Loader;
};

/**
 * Node environment. This typically will be running on a workstation or server
 **/
export const nodeBackend: () => Future<Optional<Backend>> = async () => {
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
			({ variable, config, cache }): Backend => ({
				cache,
				config,
				variable,
				loader,
			}),
		),
	);
	return backend;
};

export const browserBackend: () => Future<Backend> = async () => {
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

export const memoryBackend: () => Future<Backend> = async () => {
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

export const apiBackend: (uri: string) => Future<Optional<Backend>> = async (
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
export const detectBackend: () => Future<Optional<Backend>> = async () => {
	switch (currentPlatform) {
		case 'dom': {
			return pipe(await browserBackend(), optional.some);
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
	browserBackend,
	memoryBackend,
	detectBackend,
	apiBackend,
};
