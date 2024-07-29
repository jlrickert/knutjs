import * as Path from 'path';
import invariant from 'tiny-invariant';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterEach, describe } from 'vitest';
import { Backend } from '../Backend/index.js';
import { Storage, WebStorage, NodeStorage } from '../Storage/index.js';
import { Future, Result } from '../Utils/index.js';
import { TestUtils } from './index.js';

export type Kegpath = 'samplekeg1' | 'samplekeg2' | 'samplekeg3';

export const FIXTURE_PATH = Path.resolve(__dirname, '..', '..', 'testdata');

/**
 * Path to sample keg fixture
 **/
export const fixtureKegpath = (Kegpath: Kegpath) =>
	Path.resolve(FIXTURE_PATH, Kegpath);

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

export const fixtureStorage = new NodeStorage(FIXTURE_PATH);

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

export const testBrowserBackend = async (): Future.Future<Backend.Backend> => {
	const fixture = fixtureStorage;

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

	const backend = {
		config,
		variable,
		cache,
		loader,
	} satisfies Backend.Backend;

	for (const kegalias of [
		'samplekeg1',
		'samplekeg2',
		'samplekeg3',
	] satisfies Kegpath[]) {
		const storage = await backend.loader(kegalias);
		const path = fixtureKegpath(kegalias);
		invariant(Result.isOk(storage), `Expect fixture to load keg storage`);
		await Storage.overwrite(fixture.child(path), storage.value);
	}

	await Storage.overwrite(fixture.child(FIXTURE_CONFIG_PATH), backend.config);
	await Storage.overwrite(fixture.child(FIXTURE_VAR_PATH), backend.variable);
	await Storage.overwrite(fixture.child(FIXTURE_CACHE_PATH), backend.cache);
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
	await Storage.overwrite(fixtureStorage, root);

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
