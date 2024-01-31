import {
	getUserCacheDir,
	getUserConfigDir,
	getUserDataDir,
} from './internal/systemUtils.js';
import { ApiStorage } from './storage/apiStorage.js';
import { MemoryStorage } from './storage/memoryStorage.js';
import { GenericStorage, loadStorage } from './storage/storage.js';
import { WebStorage } from './storage/webStorage.js';
import { absurd, currentEnvironment } from './utils.js';

export const loadEnvApiStorage = async (
	url: string,
): Promise<EnvStorage | null> => {
	if (!url.match(/^https?/)) {
		return null;
	}
	const storage = new ApiStorage(url);
	const knutStorage = EnvStorage.fromStorage({
		variable: storage.child('knut/var'),
		cache: storage.child('knut/cache'),
		config: storage.child('knut/config'),
	});
	return knutStorage;
};

export class EnvStorage {
	static async fromApi(url: string): Promise<EnvStorage | null> {
		if (!url.match(/^https?/)) {
			return null;
		}
		const storage = new ApiStorage(url);
		const knutStorage = EnvStorage.fromStorage({
			variable: storage.child('knut/var'),
			cache: storage.child('knut/cache'),
			config: storage.child('knut/config'),
		});
		return knutStorage;
	}

	static async create(): Promise<EnvStorage> {
		switch (currentEnvironment) {
			case 'dom': {
				const storage = WebStorage.create('knut');
				return EnvStorage.fromStorage({
					config: storage.child('config'),
					cache: storage.child('cache'),
					variable: storage.child('data'),
				});
			}
			case 'node': {
				const cacheDir = await getUserCacheDir();
				const dataDir = await getUserDataDir();
				const configDir = await getUserConfigDir();

				const cache = loadStorage(cacheDir);
				const variable = loadStorage(dataDir);
				const config = loadStorage(configDir);
				return EnvStorage.fromStorage({
					cache,
					config,
					variable,
				});
			}
			default: {
				return absurd(currentEnvironment);
			}
		}
	}

	static fromStorage(storage: {
		cache: GenericStorage;
		config: GenericStorage;
		variable: GenericStorage;
	}): EnvStorage {
		const { config, cache, variable: data } = storage;
		return new EnvStorage(cache, config, data);
	}

	static createInMemory() {
		const storage = MemoryStorage.create();
		const data = storage.child('data');
		const config = storage.child('config');
		const cache = storage.child('cache');
		return new EnvStorage(cache, config, data);
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
