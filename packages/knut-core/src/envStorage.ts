import { sequenceS } from 'fp-ts/lib/Apply.js';
import { Optional, optional } from './internal/optional.js';
import { Future } from './internal/future.js';
import {
	getUserCacheDir,
	getUserConfigDir,
	getUserDataDir as getUserVarDir,
} from './internal/systemUtils.js';
import { ApiStorage } from './storage/apiStorage.js';
import { MemoryStorage } from './storage/memoryStorage.js';
import { GenericStorage } from './storage/storage.js';
import { fromUri, loadStorage } from './storage/storageUtils.js';
import { WebStorage } from './storage/webStorage.js';
import { currentPlatform } from './utils.js';
import { absurd, pipe } from 'fp-ts/lib/function.js';

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
	static async fromApi(url: string): Future<Optional<EnvStorage>> {
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

	static make(env: {
		cache: GenericStorage;
		config: GenericStorage;
		variable: GenericStorage;
	}): EnvStorage {
		return new EnvStorage(env.cache, env.config, env.variable);
	}

	static memoryEnv(): EnvStorage {
		const storage = MemoryStorage.create();
		const cache = storage.child('cache');
		const variable = storage.child('variables');
		const config = storage.child('config');
		return this.make({ config, cache, variable: variable });
	}

	static async nodeEnv(): Future<Optional<EnvStorage>> {
		const cacheDir = await getUserCacheDir();
		const varDir = await getUserVarDir();
		const configDir = await getUserConfigDir();

		const cache = fromUri(cacheDir);
		const variable = fromUri(varDir);
		const config = fromUri(configDir);
		const env = pipe(
			sequenceS(optional.Monad)({ cache, config, variable }),
			optional.map(this.make),
		);
		return env;
	}

	static async domEnv(): Promise<EnvStorage> {
		const storage = WebStorage.create('knut');
		const cache = storage.child('cache');
		const variable = storage.child('variables');
		const config = storage.child('config');
		return this.make({ cache, config, variable: variable });
	}

	static async create(): Future<EnvStorage> {
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
