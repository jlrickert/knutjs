import * as Path from 'path';
import invariant from 'tiny-invariant';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterEach } from 'vitest';
import { Backend } from '../Backend/index.js';
import { Storage, WebStorage, NodeStorage } from '../Storage/index.js';
import { Future, Optional } from '../Utils/index.js';

export type Kegpath = 'samplekeg1' | 'samplekeg2' | 'samplekeg3';

const fixturePath = Path.resolve(__dirname, '..', '..', 'testdata');

/**
 * Path to sample keg fixture
 **/
const fixtureKegpath = (Kegpath: Kegpath) => Path.resolve(fixturePath, Kegpath);

/**
 * Config path to the config test fixtures
 **/
const FIXTURE_CONFIG_PATH = Path.resolve(fixturePath, 'config/knut');

/**
 * Variable path to fixtures
 **/
const FIXTURE_VAR_PATH = Path.resolve(fixturePath, 'local/share/knut');

/**
 * Path to cache fixture
 **/
const FIXTURE_CACHE_PATH = Path.resolve(fixturePath, 'cache/knut');

const fixtureStorage = new NodeStorage(fixturePath);

const tempNodeStorage: () => Future.Future<Storage.GenericStorage> =
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

const testBrowserBackend = async (): Future.Future<Backend.Backend> => {
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
		return storage;
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
		invariant(
			Optional.isSome(storage),
			`Expect fixture to load keg storage`,
		);
		await Storage.overwrite(fixture.child(path), storage);
	}

	await Storage.overwrite(fixture.child(FIXTURE_CONFIG_PATH), backend.config);
	await Storage.overwrite(fixture.child(FIXTURE_VAR_PATH), backend.variable);
	await Storage.overwrite(fixture.child(FIXTURE_CACHE_PATH), backend.cache);
	return backend;
};

const testEmptyNodeBackend = async (): Future.Future<Backend.Backend> => {
	const root = await tempNodeStorage();

	const cache = root.child('cache/knut');
	const config = root.child('config/knut');
	const variable = root.child('local/share/knut');

	const loader: Backend.Loader = async (uri) => {
		return root.child(uri);
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
const testNodeBackend = async (): Future.Future<Backend.Backend> => {
	const root = await tempNodeStorage();

	const cache = root.child('cache/knut');
	const config = root.child('config/knut');
	const variable = root.child('local/share/knut');
	await Storage.overwrite(fixtureStorage, root);

	const loader: Backend.Loader = async (uri) => {
		return root.child(uri);
	};

	return {
		config,
		variable,
		cache,
		loader,
	};
};

const backends = [
	{
		name: 'Node',
		getBackend: testNodeBackend,
	},
	{
		name: 'Browser',
		getBackend: testBrowserBackend,
	},
] as const;

export const testUtils = {
	tempNodeStorage,
	testNodeBackend,
	testEmptyNodeBackend,
	testBrowserBackend,
	fixtureStorage,
	backends,
};
