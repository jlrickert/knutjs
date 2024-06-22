import { Storage } from '../Storage/index.js';
import { currentPlatform, Future, Optional, pipe } from '../Utils/index.js';
import { browserBackend } from './DomBackend.js';
import { nodeBackend } from './NodeBackend.js';
import { memoryBackend } from './MemoryBackend.js';

export type Loader = (
	uri: string,
) => Future.OptionalFuture<Storage.GenericStorage>;

/**
 * Environment that knut is running in.
 **/
export type Backend = {
	/**
	 * Cache file system
	 **/

	cache: Storage.GenericStorage;
	/**
	 * Variable file system
	 **/

	variable: Storage.GenericStorage;
	/**
	 * Configuration file system
	 **/
	config: Storage.GenericStorage;

	/**
	 * Loads file system for a keg
	 **/
	loader: Loader;
};

export const createBackend = (impl: Backend): Backend => {
	return impl;
};

/**
 * Load a default backend. This could either be the browser or node. If wanting
 * to use an api as the backend see apiPlatform as an example.
 **/
export const detectBackend: () => Future.Future<
	Optional.Optional<Backend>
> = async () => {
	switch (currentPlatform) {
		case 'dom': {
			return pipe(await browserBackend(), Optional.some);
		}
		case 'node': {
			return nodeBackend();
		}

		default: {
			return pipe(await memoryBackend(), Optional.some);
		}
	}
};
