import invariant from 'tiny-invariant';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterAll, describe } from 'vitest';
import { Backend } from '../Backend/index.js';
import { Future, pipe, Result } from '../Utils/index.js';
import { KnutConfigFile } from '../KnutConfigFile.js';
import { TestUtils } from './index.js';
import { Path } from '../Data/index.js';
import { FsStore, MemoryStore, Store, WebStore } from '../Store/index.js';

export type Kegpath = 'samplekeg1' | 'samplekeg2' | 'samplekeg3';

export const FIXTURE_PATH = Path.resolve(__dirname, '../../testdata');

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
export const fixtures = FsStore.fsStore(FIXTURE_PATH);

export const kegAliasFixtures = [
	'samplekeg1',
	'samplekeg2',
	'samplekeg3',
] as const;

/**
 * Load fixtures into the backend. This mutates backend
 */
async function loadFixutures(backend: Backend.Backend) {
	await Store.overwrite({
		source: fixtures.child(FIXTURE_DATA_PATH),
		target: backend.data,
	});
	await Store.overwrite({
		source: fixtures.child(FIXTURE_STATE_PATH),
		target: backend.state,
	});
	await Store.overwrite({
		source: fixtures.child(FIXTURE_CONFIG_PATH),
		target: backend.config,
	});
	await Store.overwrite({
		source: fixtures.child(FIXTURE_CACHE_PATH),
		target: backend.cache,
	});

	for (const kegalias of kegAliasFixtures) {
		const storage = await backend.loader(kegalias);
		const path = fixtureKegpath(kegalias);

		invariant(Result.isOk(storage), `Expect fixture to load keg storage`);
		await Store.overwrite({
			source: fixtures.child(path),
			target: storage.value,
		});
	}
}

type TestBackendOptions = {
	applyFixtures?: boolean;
};

let testMemoryStoreCounter = 0;
export async function testMemoryStore() {
	const store = MemoryStore.memoryStore({
		uri: `memorystore-${testMemoryStoreCounter}`,
	});
	testMemoryStoreCounter++;
	return store;
}

export async function testMemoryBackend(
	options?: TestBackendOptions,
): Future.Future<Backend.Backend> {
	// Holds knut configuration
	const root = MemoryStore.memoryStore();

	// Child path needs to match up with fixture cache
	const cache = root.child('cache');

	// data path needs to match up with fixture variable path
	const data = root.child('data');

	// state path needs to match up with fixture variable path
	const state = root.child('state');

	// Config path needs to match up with fixture path so that config.yaml
	// resolves to the correct location
	const config = root.child('config');

	const kegStorage = root.child('kegs');
	await Store.overwrite({
		source: fixtures.child('kegs'),
		target: kegStorage,
	});

	const loaderFactory: Backend.LoaderFactory = async ({ uri }) => {
		const storage = kegStorage.child(uri);
		return Result.ok(storage);
	};

	const backend = Backend.make({
		data,
		state,
		config,
		cache,
		loader: loaderFactory,
	});

	if (options?.applyFixtures ?? true) {
		await loadFixutures(backend);

		const knutConfig = Result.unwrap(
			await KnutConfigFile.fromStore(config),
			'Expect to load config from storage after applying fixtures',
		);
		await knutConfig.toStore({ storage: config });
	}

	return backend;
}

let testWebStoreCounter = 0;
export async function testWebStore(options?: TestBackendOptions) {
	const store = WebStore.webStore({
		uri: `webstore-${testWebStoreCounter}`,
	});
	testWebStoreCounter++;
	return store;
}

export async function testWebBackend(
	options?: TestBackendOptions,
): Future.Future<Backend.Backend> {
	const storage = await testWebStore(options);

	// Child path needs to match up with fixture cache
	const cacheStore = storage.child('cache');

	// Data path needs to match up with fixture variable path
	const dataStore = storage.child('data');

	// state path needs to match up with fixture variable path
	const stateStore = storage.child('state');

	// Config path needs to match up with fixture path so that config.yaml
	// resolves to the correct location
	const configStore = storage.child('config');

	const kegStorage = storage.child('kegs');
	await Store.overwrite({
		source: fixtures.child('kegs'),
		target: kegStorage,
	});

	const loaderFactory: Backend.LoaderFactory = async ({ uri }) => {
		const storage = kegStorage.child(uri);
		return Result.ok(storage);
	};

	const backend = Backend.make({
		config: configStore,
		data: dataStore,
		state: stateStore,
		cache: cacheStore,
		loader: loaderFactory,
	});
	await loadFixutures(backend);
	const config = await KnutConfigFile.fromBackend(backend);
	await config.relative('/').toStore({ storage: configStore });
	return backend;
}

/**
 * An empty file system storage that is located in a temporary location.
 * Removes temporary directory automatically. Unverified outside of vitest.
 */
export async function tempFsStore() {
	const rootPath = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
	const storage = FsStore.fsStore(rootPath);

	afterAll(async () => {
		try {
			await rm(storage.uri, { recursive: true });
		} catch (e) {
			throw new Error(e as any);
		}
	});

	return storage;
}

export async function testEmptyFsBackend(): Future.Future<Backend.Backend> {
	const root = await tempFsStore();

	const cacheStore = root.child('cache');
	const configStore = root.child('config');
	const stateStore = root.child('state');
	const dataStore = root.child('data');

	const loaderFactory: Backend.LoaderFactory = async ({ uri }) => {
		const stateConf = pipe(
			await KnutConfigFile.fromStore(stateStore),
			Result.getOrElse(() => KnutConfigFile.create(stateStore.uri)),
		);
		const userConf = pipe(
			await KnutConfigFile.fromStore(configStore),
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
		loader: loaderFactory,
	});
}

/**
 * Returns a platform with full fixtures
 */
export async function testFsBackend(): Future.Future<Backend.Backend> {
	const backend = await testEmptyFsBackend();
	await loadFixutures(backend);
	return backend;
}

export async function testFsStorage(): Future.Future<Store.Store> {
	return await tempFsStore();
}

type BackendTestCase = {
	readonly name: string;
	readonly loadBackend: () => Future.Future<Backend.Backend>;
	readonly loadStore: () => Future.Future<Store.Store>;
};
export const backends: BackendTestCase[] = [
	{
		name: 'Local file system',
		loadBackend: testFsBackend,
		loadStore: testFsStorage,
	},
	{
		name: 'Web',
		loadBackend: testWebBackend,
		loadStore: testWebStore,
	},
	{
		name: 'In Memory',
		loadBackend: testMemoryBackend,
		loadStore: testMemoryStore,
	},
];

export function describeEachBackend(
	desc: string,
	factory: (args: BackendTestCase) => Future.Future<void>,
): void {
	for (const options of TestUtils.backends) {
		describe(`${desc} (${options.name})`, async () => {
			await factory(options);
		});
	}
}
