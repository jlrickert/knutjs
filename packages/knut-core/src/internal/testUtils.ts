import * as Path from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { Knut } from '../knut.js';
import { EnvStorage } from '../envStorage.js';
import { GenericStorage, loadStorage, overwrite } from '../storage/storage.js';

export const testDataPath = Path.resolve(__dirname, '..', '..', 'testdata');

export const sampleKegpath = Path.resolve(
	__dirname,
	'..',
	'..',
	'testdata',
	'samplekeg',
);

export const knutConfigPath = Path.resolve(
	__dirname,
	'../../testdata/config/knut',
);

export const knutDataPath = Path.resolve(
	__dirname,
	'../../testdata/share/data/knut',
);

export type FileSystemTestContext = {
	getRoot: () => Promise<string>;
	getCacheDir: () => Promise<string>;
	getConfigDir: () => Promise<string>;
	getDataDir: () => Promise<string>;
	reset: () => Promise<void>;
};
export const createFilesystemContext = (): FileSystemTestContext => {
	let rootTestDir: string | null = null;

	const getRoot = async () => {
		if (!rootTestDir) {
			rootTestDir = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
		}
		return rootTestDir;
	};

	const reset = async () => {
		if (rootTestDir) {
			await rm(rootTestDir, { recursive: true });
			rootTestDir = null;
		}
	};

	const getCacheDir = async () => {
		return Path.join(await getRoot(), 'cache');
	};

	const getConfigDir = async () => {
		return Path.join(await getRoot(), 'config');
	};

	const getDataDir = async () => {
		return Path.join(await getRoot(), 'config');
	};

	return {
		getRoot,
		getCacheDir,
		getConfigDir,
		getDataDir,
		reset,
	};
};

export type TestDataKnutApp = {
	knut: Knut;
	storage: GenericStorage;
	reset(): Promise<void>;
};

export const createSampleKnutApp = async (): Promise<TestDataKnutApp> => {
	const { reset, getRoot } = createFilesystemContext();
	const testDataStorage = loadStorage(testDataPath);
	const storage = loadStorage(await getRoot());
	await overwrite(testDataStorage, storage);
	const knutStorage = EnvStorage.fromStorage({
		variable: storage.child('share/data/knut'),
		config: storage.child('config/knut'),
		cache: storage.child('cache/knut'),
	});

	const knut = await Knut.fromEnvironment(knutStorage);
	return {
		knut,
		storage,
		reset,
	};
};
