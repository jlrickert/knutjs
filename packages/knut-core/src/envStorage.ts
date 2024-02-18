import { Optional } from './internal/optional.js';
import { MyPromise } from './internal/promise.js';
import {
	getUserCacheDir,
	getUserConfigDir,
	getUserDataDir as getUserVarDir,
} from './internal/systemUtils.js';
import { ApiStorage } from './storage/apiStorage.js';
import { MemoryStorage } from './storage/memoryStorage.js';
import { GenericStorage } from './storage/storage.js';
import { loadStorage } from './storage/storageUtils.js';
import { WebStorage } from './storage/webStorage.js';
import { absurd, currentPlatform } from './utils.js';

export const loadEnvApiStorage = async (
	url: string,
): Promise<EnvStorage | null> => {
	if (!url.match(/^https?/)) {
		return null;
	}
	const storage = new ApiStorage(url);
	const knutStorage = EnvStorage.fromStorage({
		variable: storage.child('var'),
		cache: storage.child('cache'),
		config: storage.child('config'),
	});
	return knutStorage;
};

export class EnvStorage {
	static async fromApi(url: string): MyPromise<Optional<EnvStorage>> {
		if (!url.match(/^https?/)) {
			return null;
		}
		const storage = new ApiStorage(url);
		const knutStorage = EnvStorage.fromStorage({
			variable: storage.child('var'),
			cache: storage.child('cache'),
			config: storage.child('config'),
		});
		return knutStorage;
	}

	static async create(): MyPromise<EnvStorage> {
		switch (currentPlatform) {
			case 'dom': {
				const storage = WebStorage.create('knut');
				return EnvStorage.fromStorage({
					config: storage.child('config'),
					cache: storage.child('cache'),
					variable: storage.child('var'),
				});
			}
			case 'node': {
				const cacheDir = await getUserCacheDir();
				const varDir = await getUserVarDir();
				const configDir = await getUserConfigDir();

				const cache = loadStorage(cacheDir);
				const variable = loadStorage(varDir);
				const config = loadStorage(configDir);
				return EnvStorage.fromStorage({
					cache,
					config,
					variable,
				});
			}
			default: {
				return absurd(currentPlatform);
			}
		}
	}

	static fromStorage(storage: {
		cache: GenericStorage;
		config: GenericStorage;
		variable: GenericStorage;
	}): EnvStorage {
		const { config, cache, variable } = storage;
		return new EnvStorage(cache, config, variable);
	}

	static createInMemory() {
		const storage = MemoryStorage.create();
		const variable = storage.child('var');
		const config = storage.child('config');
		const cache = storage.child('cache');
		return new EnvStorage(cache, config, variable);
	}

	private constructor(
		readonly cache: GenericStorage,
		readonly config: GenericStorage,
		readonly variable: GenericStorage,
	) {}

	child(subpath: string) {
		return new EnvStorage(
			this.cache.child(subpath),
			this.config.child(subpath),
			this.variable.child(subpath),
		);
	}
}
