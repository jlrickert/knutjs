import * as Path from 'path';
import invariant from 'tiny-invariant';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterEach, describe } from 'vitest';
import { optional } from './optional.js';
import { Future } from './future.js';
import { Loader, Backend } from '../backend.js';
import { overwrite } from '../storage/storageUtils.js';
import { GenericStorage } from '../storage/storage.js';
import { NodeStorage } from '../storage/nodeStorage.js';
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

const testBrowserBackend = async (): Future<Backend> => {
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
	const loader: Loader = async (uri: string) => {
		const storage = kegStorage.child(uri);
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

const testEmptyNodeBackend = async (): Future<Backend> => {
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
const testNodeBackend = async (): Future<Backend> => {
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

/**
 * TestUtils is a namespace for utilities to make testing much easier
 */
export class TestUtils {
	static readonly backends = [
		{
			name: 'Node',
			loadBackend: testNodeBackend,
		},
		{
			name: 'Browser',
			loadBackend: testBrowserBackend,
		},
	];

	/**
	 * fixtureStorage is the raw data for fixtures.
	 * DO NOT WRITE ANYTHING HERE!!!
	 **/
	static readonly fixtureStorage = fixtureStorage;

	/**
	 * makeNodeBackend creates a temporary directory loaded with fixtures.
	 * This is intened for testing when a node environment is available.
	 */
	static readonly makeNodeBackend = testNodeBackend;

	/**
	 * makeEmptyNodeBackend creates a temporary directory loaded with fixtures.
	 * This is intened for testing when a node environment is available.
	 */
	static readonly makeEmptyNodeBackend = testEmptyNodeBackend;

	/**
	 * makeBrowserBackend creates backend for testing storage on a browser.
	 */
	static readonly makeBrowserBackend = testBrowserBackend;

	/**
	 * makeTempstorage creates a temporary storage in memory.
	 *
	 * On mac I think this creates a new direcory on a ram disk
	 */
	static readonly makeTempStorage = tempNodeStorage;

	static readonly describeEachBackend = async (
		desc: string,
		factory: (f: (typeof TestUtils)['backends'][number]) => Future<void>,
	) => {
		for await (const { name, loadBackend } of TestUtils.backends) {
			describe(`${desc} (${name})`, async () => {
				factory({ name, loadBackend });
			});
		}
	};
}
