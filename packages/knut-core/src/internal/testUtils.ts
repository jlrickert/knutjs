import * as Path from 'path';
import invariant from 'tiny-invariant';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterEach } from 'vitest';
import { optional } from './optional.js';
import { Future } from './future.js';
import { overwrite } from '../storage/storageUtils.js';
import { GenericStorage } from '../storage/storage.js';
import { NodeStorage } from '../storage/nodeStorage.js';
import { Loader, Backend } from '../backend.js';
import { WebStorage } from '../storage/webStorage.js';

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

const tempNodeStorage: () => Future<GenericStorage> = async () => {
	const rootPath = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
	const storage = new NodeStorage(rootPath);

	afterEach(async () => {
		try {
			await rm(storage.root, { recursive: true });
		} catch (e) {}
	});

	return storage;
};

const testBrowserBackend: () => Future<Backend> = async () => {
	const fixture = fixtureStorage;

	const storage = WebStorage.create('knut');

	// Child path needs to match up with fixture cache
	const cache = storage.child('cache/knut');

	// Variable path needs to match up with fixture variable path
	const variable = storage.child('local/share/knut');

	// Config path needs to match up with fixture path so that config.yaml
	// resolves to the correct location
	const config = storage.child('config/knut');

	const loader: Loader = async (uri: string) => {
		const storage = WebStorage.create('knut-kegs').child(uri);
		return storage;
	};
	const backend = {
		config,
		variable,
		cache,
		loader,
	} satisfies Backend;

	for (const kegalias of [
		'samplekeg1',
		'samplekeg2',
		'samplekeg3',
	] satisfies Kegpath[]) {
		const storage = await backend.loader(kegalias);
		const path = fixtureKegpath(kegalias);
		invariant(
			optional.isSome(storage),
			`Expect fixture to load keg storage`,
		);
		await overwrite(fixture.child(path), storage);
	}

	await overwrite(fixture.child(FIXTURE_CONFIG_PATH), backend.config);
	await overwrite(fixture.child(FIXTURE_VAR_PATH), backend.variable);
	await overwrite(fixture.child(FIXTURE_CACHE_PATH), backend.cache);
	return backend;
};

const testEmptyNodeBackend: () => Future<Backend> = async () => {
	const root = await tempNodeStorage();

	const cache = root.child('cache/knut');
	const config = root.child('config/knut');
	const variable = root.child('local/share/knut');

	const loader: Loader = async (uri) => {
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
const testNodeBackend: () => Future<Backend> = async () => {
	const root = await tempNodeStorage();

	const cache = root.child('cache/knut');
	const config = root.child('config/knut');
	const variable = root.child('local/share/knut');
	await overwrite(fixtureStorage, root);

	const loader: Loader = async (uri) => {
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
