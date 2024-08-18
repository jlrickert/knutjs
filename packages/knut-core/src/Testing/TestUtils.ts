import * as Path from 'path';
import invariant from 'tiny-invariant';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterEach, describe } from 'vitest';
import { Backend } from '../Backend/index.js';
import {
	Storage,
	WebStorage,
	NodeStorage,
	MemoryStorage,
} from '../Storage/index.js';
import { Future, Result } from '../Utils/index.js';
import { TestUtils } from './index.js';

export type Kegpath = 'samplekeg1' | 'samplekeg2' | 'samplekeg3';

export const FIXTURE_PATH = Path.resolve(__dirname, '..', '..', 'testdata');

/**
 * Path to sample keg fixtures on the file system.
 */
export const fixtureKegpath = (kegpath: Kegpath) =>
	Path.resolve(FIXTURE_PATH, kegpath);

export const FIXTURE_PATH_MAP = {
	samplekeg1: fixtureKegpath('samplekeg1'),
	samplekeg2: fixtureKegpath('samplekeg2'),
	samplekeg3: fixtureKegpath('samplekeg3'),
} as const;

/**
 * Config path to the config test fixtures
 **/
export const FIXTURE_CONFIG_PATH = Path.resolve(FIXTURE_PATH, 'config/knut');

/**
 * Variable path to fixtures
 **/
export const FIXTURE_VAR_PATH = Path.resolve(FIXTURE_PATH, 'local/share/knut');

/**
 * Path to cache fixture
 **/
export const FIXTURE_CACHE_PATH = Path.resolve(FIXTURE_PATH, 'cache/knut');

/**
 * Base fixture file system. DO NOT MUTATE.
 */
export const fixtureStorage = new NodeStorage(FIXTURE_PATH);

/**
 * Load fixtures into the backend. This mutates backend
 */
const loadFixutures = async (backend: Backend.Backend) => {
	for (const kegalias of [
		'samplekeg1',
		'samplekeg2',
		'samplekeg3',
	] satisfies Kegpath[]) {
		const storage = await backend.loader(kegalias);
		const path = fixtureKegpath(kegalias);
		invariant(Result.isOk(storage), `Expect fixture to load keg storage`);
		await Storage.overwrite({
			source: fixtureStorage.child(path),
			target: storage.value,
		});
	}

	await Storage.overwrite({
		source: fixtureStorage.child(FIXTURE_CONFIG_PATH),
		target: backend.config,
	});
	await Storage.overwrite({
		source: fixtureStorage.child(FIXTURE_VAR_PATH),
		target: backend.variable,
	});
	await Storage.overwrite({
		source: fixtureStorage.child(FIXTURE_CACHE_PATH),
		target: backend.cache,
	});
};

/**
 * An empty file system storage that is located in a temporary location.
 * Removes tempoary directory automatically. Unverified outside of vitest.
 */
export const tempNodeStorage: () => Future.Future<Storage.GenericStorage> =
	async () => {
		const rootPath = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
		const storage = new NodeStorage(rootPath);

		afterEach(async () => {
			try {
				await rm(storage.uri, { recursive: true });
			} catch (e) {}
		});

		return storage;
	};

export const testMemoryBackend = async (): Future.Future<Backend.Backend> => {
	// Holds knut configuration
	const storage = MemoryStorage.create();

	// Child path needs to match up with fixture cache
	const cache = storage.child('cache/knut');

	// Variable path needs to match up with fixture variable path
	const variable = storage.child('local/share/knut');

	// Config path needs to match up with fixture path so that config.yaml
	// resolves to the correct location
	const config = storage.child('config/knut');

	const kegStorage = MemoryStorage.create();
	const loader: Backend.Loader = async (uri: string) => {
		const storage = kegStorage.child(uri);
		return Result.ok(storage);
	};

	const backend = {
		config,
		variable,
		cache,
		loader,
	} satisfies Backend.Backend;

	await loadFixutures(backend);
	return backend;
};

export const testBrowserBackend = async (): Future.Future<Backend.Backend> => {
	const storage = WebStorage.create('knut');

	// Child path needs to match up with fixture cache
	const cache = storage.child('cache/knut');

	// Variable path needs to match up with fixture variable path
	const variable = storage.child('local/share/knut');

	// Config path needs to match up with fixture path so that config.yaml
	// resolves to the correct location
	const config = storage.child('config/knut');

	const kegStorage = WebStorage.create('knut-kegs');
	const loader: Backend.Loader = async (uri: string) => {
		const storage = kegStorage.child(uri);
		return Result.ok(storage);
	};

	const backend: Backend.Backend = Backend.make({
		config,
		variable,
		cache,
		loader,
	});
	await loadFixutures(backend);
	return backend;
};

export const testEmptyNodeBackend =
	async (): Future.Future<Backend.Backend> => {
		const root = await tempNodeStorage();

		const cache = root.child('cache/knut');
		const config = root.child('config/knut');
		const variable = root.child('local/share/knut');

		const loader: Backend.Loader = async (uri) => {
			return Result.ok(root.child(uri));
		};

		return {
			config,
			variable,
			cache,
			loader,
		};
	};

/**
 * Returns a platform with full fixtures
 **/
export const testNodeBackend = async (): Future.Future<Backend.Backend> => {
	const root = await tempNodeStorage();

	const cache = root.child('cache/knut');
	const config = root.child('config/knut');
	const variable = root.child('local/share/knut');

	const loader: Backend.Loader = async (uri) => {
		return Result.ok(root.child(uri));
	};
	const backend = Backend.make({
		loader,
		config,
		variable,
		cache,
	});
	await loadFixutures(backend);
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

// export const loadFile =
