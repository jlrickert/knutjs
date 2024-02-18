import {
	getUserCacheDir,
	getUserConfigDir,
	getUserDataDir as getUserVarDir,
} from './internal/systemUtils.js';
import { MemoryStorage } from './storage/memoryStorage.js';
import { GenericStorage } from './storage/storage.js';
import { WebStorage } from './storage/webStorage.js';
import { absurd, currentPlatform } from './utils.js';

export type EnvStorage = {
	config: GenericStorage;
	variable: GenericStorage;
	cache: GenericStorage;
};

export class EnvStorageApi implements EnvStorage {
	static make(env: EnvStorage): EnvStorage {
		return { cache: env.cache, config: env.config, variable: env.variable };
	}

	static memoryEnv(): EnvStorage {
		const storage = MemoryStorage.create();
		const cache = storage.child('cache');
		const variable = storage.child('variables');
		const config = storage.child('config');
		return this.make({ config, cache, variable: variable });
	}

	static async nodeEnv(): Promise<EnvStorage> {
		const cacheDir = await getUserCacheDir();
		const varDir = await getUserVarDir();
		const configDir = await getUserConfigDir();

		const cache = GenericStorage.fromURI(cacheDir);
		const variable = GenericStorage.fromURI(varDir);
		const config = GenericStorage.fromURI(configDir);
		return this.make({ cache, config, variable: variable });
	}

	static async domEnv(): Promise<EnvStorage> {
		const storage = WebStorage.create('knut');
		const cache = storage.child('cache');
		const variable = storage.child('variables');
		const config = storage.child('config');
		return this.make({ cache, config, variable: variable });
	}

	/**
	 * Create environment storage on the current platform
	 **/
	static async create(): Promise<EnvStorage> {
		switch (currentPlatform) {
			case 'dom': {
				return await this.domEnv();
			}
			case 'node': {
				return await this.nodeEnv();
			}

			default: {
				return absurd(currentPlatform);
			}
		}
	}

	constructor(private env: EnvStorage) {}
	get config(): GenericStorage {
		return this.env.config;
	}
	get variable(): GenericStorage {
		return this.env.variable;
	}
	get cache(): GenericStorage {
		return this.env.cache;
	}
}

export const envStorageM = {
	make(env: EnvStorage): EnvStorage {
		return { cache: env.cache, config: env.config, variable: env.variable };
	},

	memoryEnv(): EnvStorage {
		const storage = MemoryStorage.create();
		const cache = storage.child('cache');
		const variable = storage.child('variables');
		const config = storage.child('config');
		return this.make({ config, cache, variable: variable });
	},

	async nodeEnv(): Promise<EnvStorage> {
		const cacheDir = await getUserCacheDir();
		const varDir = await getUserVarDir();
		const configDir = await getUserConfigDir();

		const cache = storageM.fromURI(cacheDir);
		const variable = storageM.fromURI(varDir);
		const config = storageM.fromURI(configDir);
		return this.make({ cache, config, variable: variable });
	},

	async domEnv(): Promise<EnvStorage> {
		const storage = WebStorage.create('knut');
		const cache = storage.child('cache');
		const variable = storage.child('variables');
		const config = storage.child('config');
		return this.make({ cache, config, variable: variable });
	},

	/**
	 * Create environment storage on the current platform
	 **/
	async create(): Promise<EnvStorage> {
		switch (currentPlatform) {
			case 'dom': {
				return await this.domEnv();
			}
			case 'node': {
				return await this.nodeEnv();
			}

			default: {
				return absurd(currentPlatform);
			}
		}
	},

	child(env: EnvStorage, path: string): EnvStorage {
		return {
			variable: env.variable.child(path),
			cache: env.cache.child(path),
			config: env.config.child(path),
		};
	},
};
