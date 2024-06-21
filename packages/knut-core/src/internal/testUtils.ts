import * as Path from 'path';
import invariant from 'tiny-invariant';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterEach, describe } from 'vitest';
import { Future } from './future.js';
import { TBackend, Loader } from '../Backend.js';
import { overwrite } from '../storage/storageUtils.js';
import { TStorage } from '../storage/Storage.js';
import { NodeStorage } from '../storage/NodeStorage.js';
import { WebStorage } from '../storage/webStorage.js';
import { Optional } from './index.js';

export type Kegpath = 'samplekeg1' | 'samplekeg2' | 'samplekeg3';

const FIXTURE_PATH = Path.resolve(__dirname, '..', '..', 'testdata');

const FIXTURE_KEGS_PATH = Path.resolve(FIXTURE_PATH, 'kegs');

/**
 * Path to sample keg fixture
 **/
const fixtureKegpath = (Kegpath: Kegpath) =>
	Path.resolve(FIXTURE_KEGS_PATH, Kegpath);

/**
 * Config path to the config test fixtures
 **/
const FIXTURE_CONFIG_PATH = Path.resolve(FIXTURE_PATH, 'config/knut');

/**
 * Variable path to fixtures
 **/
const FIXTURE_VAR_PATH = Path.resolve(FIXTURE_PATH, 'local/share/knut');

/**
 * Path to cache fixture
 **/
const FIXTURE_CACHE_PATH = Path.resolve(FIXTURE_PATH, 'cache/knut');

const fixtureStorage = new NodeStorage(FIXTURE_PATH);

/**
 * Creates a new empty node storage
 */
const tempNodeStorage: () => Future<GenericStorage> = async () => {
	const rootPath = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
	const storage = new NodeStorage(rootPath);

	afterEach(async () => {
		try {
			await rm(storage.root, { recursive: true });
		} catch (e) { }
	});

	return storage;
};

const testBrowserBackend = async (): Future<TBackend> => {
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
		return kegStorage.child(uri);
	};

	const backend: TBackend = {
		config,
		variable,
		cache,
		loader,
	};

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
		await overwrite(fixture.child(path), storage);
	}

	await overwrite(fixture.child(FIXTURE_KEGS_PATH), kegStorage);
	await overwrite(fixture.child(FIXTURE_CONFIG_PATH), backend.config);
	await overwrite(fixture.child(FIXTURE_VAR_PATH), backend.variable);
	await overwrite(fixture.child(FIXTURE_CACHE_PATH), backend.cache);
	return backend;
};

const testEmptyNodeBackend = async (): Future<TBackend> => {
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
 * Returns a platform with full fixtures. Fixtures kegs may be loaded from the
 * following places in:
 *
 * - samplekeg1
 *  -
 */
const testNodeBackend = async (): Future<TBackend> => {
	const root = await tempNodeStorage();

	const cache = root.child('cache/knut');
	const config = root.child('config/knut');
	const variable = root.child('local/share/knut');
	const kegStorage = root.child('kegs');
	await overwrite(fixtureStorage, root);

	const loader: Loader = async (uri) => {
		return kegStorage.child(uri);
	};

	return {
		config,
		variable,
		cache,
		loader,
	};
};

// const backends = [
// 	{
// 		name: 'Node',
// 		getBackend: testNodeBackend,
// 	},
// 	{
// 		name: 'Browser',
// 		getBackend: testBrowserBackend,
// 	},
// ] as const;

// export const testUtils = {
// 	tempNodeStorage,
// 	testNodeBackend,
// 	testEmptyNodeBackend,
// 	testBrowserBackend,
// 	fixtureStorage,
// 	backends,
// };

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
	 * This is intended for testing when a node environment is available.
	 */
	static readonly makeNodeBackend = testNodeBackend;

	/**
	 * makeEmptyNodeBackend creates a temporary directory loaded with fixtures.
	 * This is intended for testing when a node environment is available.
	 */
	static readonly makeEmptyNodeBackend = testEmptyNodeBackend;

	/**
	 * makeBrowserBackend creates backend for testing storage on a browser.
	 */
	static readonly makeBrowserBackend = testBrowserBackend;

	/**
	 * Creates a temporary storage in memory.
	 *
	 * On mac I think this creates a new directory on a ram disk
	 */
	static readonly makeTempStorage = tempNodeStorage;

	static describeEachBackend(
		desc: string,
		factory: (f: (typeof TestUtils)['backends'][number]) => Future<void>,
	) {
		for (const { name, loadBackend } of TestUtils.backends) {
			describe(`${desc} (${name})`, async () => {
				await factory({
					name,

					loadBackend,
				});
			});
		}
	}
}
