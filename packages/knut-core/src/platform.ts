import invariant from 'tiny-invariant';
import { Reader } from 'fp-ts/lib/Reader.js';
import { EnvStorage } from './envStorage.js';
import { Optional, optional } from './internal/optional.js';
import { Future } from './internal/future.js';
import { KnutConfigFile } from './configFile.js';
import { currentPlatform } from './utils.js';
import { GenericStorage } from './storage/storage.js';
import { NodeStorage } from './storage/nodeStorage.js';
import { WebStorage } from './storage/webStorage.js';
import { MemoryStorage } from './storage/memoryStorage.js';

export type PlatformEnv = {
	storage: EnvStorage;
	loader: (URI: string) => GenericStorage;
};

export type Platform<T> = Reader<PlatformEnv, T>;

let globalStorage = [await EnvStorage.create()];

const nodePlatform: () => Future<PlatformEnv> = async () => {
	const storage = await EnvStorage.nodeEnv();
	invariant(
		optional.isSome(storage),
		'nodePlatform should only be called in a node.js environment',
	);
	return {
		storage,
		loader: (uri) => {
			return new NodeStorage(uri);
		},
	};
};

const domPlatform: () => Future<PlatformEnv> = async () => {
	const loader = (uri: string) => WebStorage.create('knut-kegs').child(uri);
	const storage = await EnvStorage.domEnv();
	return { storage, loader };
};

const memoryPlatform: () => Future<PlatformEnv> = async () => {
	const store = MemoryStorage.create();
	const storage = EnvStorage.memoryEnv();
	const loader = (uri: string) => store.child(uri);
	return { storage, loader };
};

const detectPlatform: () => Future<PlatformEnv> = async () => {
	switch (currentPlatform) {
		case 'dom': {
			return domPlatform();
		}
		case 'node': {
			return nodePlatform();
		}

		default: {
			return memoryPlatform();
		}
	}
};

const getStorage = () => {
	const store = globalStorage[globalStorage.length - 1];
	invariant(optional.isSome(store));
	return store;
};

const getVarConfig: () => Future<Optional<KnutConfigFile>> = async () => {
	return KnutConfigFile.fromStorage(getStorage().variable);
};

const getUserConfig: () => Future<Optional<KnutConfigFile>> = async () => {
	return KnutConfigFile.fromStorage(getStorage().config);
};

export const platform = {
	nodePlatform: nodePlatform,
	domPlatform: domPlatform,
	memoryPlatform: memoryPlatform,
	detectPlatform: detectPlatform,

	get storage() {
		return getStorage();
	},
	setStorage(env: EnvStorage) {
		globalStorage.push(env);
	},

	getVarConfig,
	getUserConfig,
};
