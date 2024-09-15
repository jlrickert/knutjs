import * as Path from 'path';
import invariant from 'tiny-invariant';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterAll, describe } from 'vitest';
import { Backend } from '../Backend/index.js';
import {
	Storage,
	WebStorage,
	NodeStorage,
	MemoryStorage,
} from '../Storage/index.js';
import { Future, pipe, Result } from '../Utils/index.js';
import { KnutConfigFile } from '../ConfigFile.js';
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
export const fixtures = new NodeStorage(FIXTURE_PATH);

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

/**
 * An empty file system storage that is located in a temporary location.
 * Removes tempoary directory automatically. Unverified outside of vitest.
 */
export const tempNodeStorage =
	async (): Future.Future<Storage.GenericStorage> => {
		const rootPath = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
		const storage = new NodeStorage(rootPath);

		afterAll(async () => {
			try {
				await rm(storage.uri, { recursive: true });
			} catch (e) {
				throw new Error(e as any);
			}
		});

		return storage;
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

	const loader: Backend.Loader = async (uri, config) => {
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

export const testBrowserBackend = async (): Future.Future<Backend.Backend> => {
	const storage = WebStorage.create('knut');

	// Child path needs to match up with fixture cache
	const cache = storage.child('cache');

	// Data path needs to match up with fixture variable path
	const data = storage.child('data');

	// state path needs to match up with fixture variable path
	const state = storage.child('state');

	// Config path needs to match up with fixture path so that config.yaml
	// resolves to the correct location
	const config = storage.child('config');

	const kegStorage = WebStorage.create('knut-kegs');
	await Storage.overwrite({
		source: fixtures.child('kegs'),
		target: kegStorage,
	});

	const loader: Backend.Loader = async (uri, config) => {
		const storage = kegStorage.child(uri);
		return Result.ok(storage);
	};

	const backend: Backend.Backend = Backend.make({
		config,
		data,
		state,
		cache,
		loader,
	});
	await loadFixutures(backend);
	const configFile = Result.unwrap(
		await KnutConfigFile.fromStorage(config),
		`Expecting config file to be found`,
	);
	Result.unwrap(
		await configFile.relative('/').toStorage({ storage: config }),
		'Expecting to be able to write to config',
	);
	return backend;
};

export const testEmptyNodeBackend =
	async (): Future.Future<Backend.Backend> => {
		const root = await tempNodeStorage();

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
			const config = stateConf.merge(userConf);
			const path = config.getKeg(uri)?.url ?? uri;
			return Result.ok(root.child(path));
		};

		return {
			config: configStore,
			data: dataStore,
			state: stateStore,
			cache: cacheStore,
			loader,
		};
	};

/**
 * Returns a platform with full fixtures
 */
export const testNodeBackend = async (): Future.Future<Backend.Backend> => {
	const backend = await testEmptyNodeBackend();
	// const root = await tempNodeStorage();
	//
	// const cache = root.child('cache');
	// const config = root.child('config');
	// const data = root.child('data');
	// const state = root.child('state');
	// const kegStorage = root.child('kegs');
	// await Storage.overwrite({
	// 	source: fixtures.child('kegs'),
	// 	target: kegStorage,
	// });
	//
	// const loader: Backend.Loader = async (uri) => {
	// 	return Result.ok(root.child(`kegs/${uri}`));
	// };
	// const backend = Backend.make({
	// 	config,
	// 	state,
	// 	data,
	// 	cache,
	// 	loader,
	// });
	await loadFixutures(backend);
	// const configuration = Result.unwrap(
	// 	await KnutConfigFile.fromStorage(config),
	// );
	// await configuration.relative('/kegs').toStorage(config);
	return backend;
};

type BackendTestCase = {
	readonly name: string;
	readonly loadBackend: () => Future.Future<Backend.Backend>;
};
export const backends: BackendTestCase[] = [
	{
		name: 'Node',
		loadBackend: testNodeBackend,
	},
	{
		name: 'Browser',
		loadBackend: testBrowserBackend,
	},
	{
		name: 'Memory',
		loadBackend: testMemoryBackend,
	},
];

export const describeEachBackend = (
	desc: string,
	factory: (args: BackendTestCase) => Future.Future<void>,
): void => {
	for (const { name, loadBackend } of TestUtils.backends) {
		describe(`${desc} (${name})`, async () => {
			await factory({ name, loadBackend });
		});
	}
};
