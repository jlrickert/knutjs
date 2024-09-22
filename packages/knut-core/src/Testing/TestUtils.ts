import * as Path from 'path';
import invariant from 'tiny-invariant';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterAll, describe } from 'vitest';
import { Backend } from '../Backend/index.js';
import {
	Storage,
	WebStorage,
	FsStorage,
	MemoryStorage,
} from '../Storage/index.js';
import { Future, pipe, Result } from '../Utils/index.js';
import { KnutConfigFile } from '../KnutConfigFile.js';
import { TestUtils } from './index.js';

export type Kegpath = 'samplekeg1' | 'samplekeg2' | 'samplekeg3';

export const FIXTURE_PATH = Path.resolve(__dirname, '..', '..', 'testdata');

/**
 * Fixtures data path
 */
export const FIXTURE_DATA_PATH = Path.resolve(FIXTURE_PATH, 'local/share/knut');

/**
 * Fixtures state path
 */
export const FIXTURE_STATE_PATH = Path.resolve(
	FIXTURE_PATH,
	'local/state/knut',
);

/**
 * Fixtures config path
 */
export const FIXTURE_CONFIG_PATH = Path.resolve(FIXTURE_PATH, 'config/knut');

/**
 * Path to cache fixture
 */
export const FIXTURE_CACHE_PATH = Path.resolve(FIXTURE_PATH, 'cache/knut');

/**
 * Path to keg fixtures
 */
export const FIXTURE_KEGS_PATH = Path.resolve(FIXTURE_PATH, 'kegs');

/**
 * Path to sample keg fixtures on the file system.
 */
export const fixtureKegpath = (kegpath: Kegpath) =>
	Path.resolve(FIXTURE_KEGS_PATH, kegpath);

export const FIXTURE_PATH_MAP = {
	samplekeg1: fixtureKegpath('samplekeg1'),
	samplekeg2: fixtureKegpath('samplekeg2'),
	samplekeg3: fixtureKegpath('samplekeg3'),
} as const;

/**
 * Base fixture file system. DO NOT MUTATE.
 */
export const fixtures = new FsStorage(FIXTURE_PATH);

export const kegAliasFixtures = [
	'samplekeg1',
	'samplekeg2',
	'samplekeg3',
] as const;

/**
 * Load fixtures into the backend. This mutates backend
 */
const loadFixutures = async (backend: Backend.Backend) => {
	await Storage.overwrite({
		source: fixtures.child(FIXTURE_DATA_PATH),
		target: backend.data,
	});
	await Storage.overwrite({
		source: fixtures.child(FIXTURE_STATE_PATH),
		target: backend.state,
	});
	await Storage.overwrite({
		source: fixtures.child(FIXTURE_CONFIG_PATH),
		target: backend.config,
	});
	await Storage.overwrite({
		source: fixtures.child(FIXTURE_CACHE_PATH),
		target: backend.cache,
	});

	for (const kegalias of kegAliasFixtures) {
		const storage = await backend.loader(kegalias);
		const path = fixtureKegpath(kegalias);

		invariant(Result.isOk(storage), `Expect fixture to load keg storage`);
		await Storage.overwrite({
			source: fixtures.child(path),
			target: storage.value,
		});
	}
};

let testMemoryStorageCounter = 0;
export const testMemoryStorage = async () => {
	const store = WebStorage.create(`memorystore-${testMemoryStorageCounter}`);
	testMemoryStorageCounter++;
	return store;
};

export const testMemoryBackend = async (): Future.Future<Backend.Backend> => {
	// Holds knut configuration
	const storage = MemoryStorage.create();

	// Child path needs to match up with fixture cache
	const cache = storage.child('cache');

	// data path needs to match up with fixture variable path
	const data = storage.child('data');

	// state path needs to match up with fixture variable path
	const state = storage.child('state');

	// Config path needs to match up with fixture path so that config.yaml
	// resolves to the correct location
	const config = storage.child('config');

	const kegStorage = storage.child('kegs');
	await Storage.overwrite({
		source: fixtures.child('kegs'),
		target: kegStorage,
	});

	const loader: Backend.Loader = async (uri) => {
		const storage = kegStorage.child(uri);
		return Result.ok(storage);
	};

	const backend = Backend.make({
		data,
		state,
		config,
		cache,
		loader,
	});

	await loadFixutures(backend);

	const knutConfig = Result.unwrap(
		await KnutConfigFile.fromStorage(config),
		'Expect load fixture to create valid config',
	);
	await knutConfig.toStorage({ storage: config });

	return backend;
};

let testBrowserStorageCounter = 0;
export const testBrowserStorage = async () => {
	const store = WebStorage.create(`webstore-${testBrowserStorageCounter}`);
	testBrowserStorageCounter++;
	return store;
};

export const testBrowserBackend = async (): Future.Future<Backend.Backend> => {
	const storage = WebStorage.create('knut');

	// Child path needs to match up with fixture cache
	const cacheStore = storage.child('cache');

	// Data path needs to match up with fixture variable path
	const dataStore = storage.child('data');

	// state path needs to match up with fixture variable path
	const stateStore = storage.child('state');

	// Config path needs to match up with fixture path so that config.yaml
	// resolves to the correct location
	const configStore = storage.child('config');

	const kegStorage = WebStorage.create('knut-kegs');
	await Storage.overwrite({
		source: fixtures.child('kegs'),
		target: kegStorage,
	});

	const loader: Backend.Loader = async (uri) => {
		const storage = kegStorage.child(uri);
		return Result.ok(storage);
	};

	const backend = Backend.make({
		config: configStore,
		data: dataStore,
		state: stateStore,
		cache: cacheStore,
		loader,
	});
	await loadFixutures(backend);
	const config = await KnutConfigFile.fromBackend(backend);
	await config.relative('/').toStorage({ storage: configStore });
	return backend;
};

/**
 * An empty file system storage that is located in a temporary location.
 * Removes tempoary directory automatically. Unverified outside of vitest.
 */
export const tempFsStorage =
	async (): Future.Future<Storage.GenericStorage> => {
		const rootPath = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
		const storage = new FsStorage(rootPath);

		afterAll(async () => {
			try {
				await rm(storage.uri, { recursive: true });
			} catch (e) {
				throw new Error(e as any);
			}
		});

		return storage;
	};

export const testEmptyFsBackend = async (): Future.Future<Backend.Backend> => {
	const root = await tempFsStorage();

	const cacheStore = root.child('cache');
	const configStore = root.child('config');
	const stateStore = root.child('state');
	const dataStore = root.child('data');

	const loader: Backend.Loader = async (uri) => {
		const stateConf = pipe(
			await KnutConfigFile.fromStorage(stateStore),
			Result.getOrElse(() => KnutConfigFile.create(stateStore.uri)),
		);
		const userConf = pipe(
			await KnutConfigFile.fromStorage(configStore),
			Result.getOrElse(() => KnutConfigFile.create(dataStore.uri)),
		);
		const config = KnutConfigFile.merge(stateConf, userConf);
		const path = config.getKeg(uri)?.url ?? uri;
		return Result.ok(root.child(path));
	};

	return Backend.make({
		config: configStore,
		data: dataStore,
		state: stateStore,
		cache: cacheStore,
		loader,
	});
};

/**
 * Returns a platform with full fixtures
 */
export const testFsBackend = async (): Future.Future<Backend.Backend> => {
	const backend = await testEmptyFsBackend();
	await loadFixutures(backend);
	return backend;
};

export const testFsStorage =
	async (): Future.Future<Storage.GenericStorage> => {
		return await tempFsStorage();
	};

type BackendTestCase = {
	readonly name: string;
	readonly loadBackend: () => Future.Future<Backend.Backend>;
	readonly loadStorage: () => Future.Future<Storage.BaseStorage>;
};
export const backends: BackendTestCase[] = [
	{
		name: 'Local file system',
		loadBackend: testFsBackend,
		loadStorage: testFsStorage,
	},
	{
		name: 'Browser',
		loadBackend: testBrowserBackend,
		loadStorage: testBrowserStorage,
	},
	{
		name: 'In Memory',
		loadBackend: testMemoryBackend,
		loadStorage: testMemoryStorage,
	},
];

export const describeEachBackend = (
	desc: string,
	factory: (args: BackendTestCase) => Future.Future<void>,
): void => {
	for (const options of TestUtils.backends) {
		describe(`${desc} (${options.name})`, async () => {
			await factory(options);
		});
	}
};
