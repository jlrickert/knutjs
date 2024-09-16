import * as Path from 'path';
import { homedir } from 'os';
import { Future, Optional, pipe, Result } from '../Utils/index.js';
import { Storage } from '../Storage/index.js';
import { KnutConfigFile } from '../KnutConfigFile.js';
import { Backend, make, Loader } from './Backend.js';
import { BackendError } from './index.js';

const getUserDataDir = async (): Future.Future<string> => {
	const platform = process.platform;

	const dataDir = process.env.XDG_DATA_HOME ?? null;
	if (dataDir) {
		return dataDir;
	}

	if (platform === 'win32') {
		const dir = process.env.APPDATA || '';
		if (dir === '') {
			return Path.join(homedir(), 'AppData', 'Local');
		}
		return dir;
	}

	if (platform === 'darwin') {
		return Path.join(homedir(), 'Library', 'Application Support');
	}

	if (platform === 'linux') {
		return Path.join(homedir(), '.local', 'share');
	}

	throw new Error(`Platform ${platform} not supported`);
};

const getUserStateDir = async (): Future.Future<string> => {
	const platform = process.platform;

	const dataDir = process.env.XDG_STATE_HOME ?? null;
	if (dataDir) {
		return dataDir;
	}

	if (platform === 'win32') {
		const dir = process.env.LOCALAPPDATA || '';
		if (dir === '') {
			return Path.join(homedir(), 'LocalAppData', 'Local');
		}
		return dir;
	}

	if (platform === 'darwin') {
		return Path.join(homedir(), 'Library', 'Application Support');
	}

	if (platform === 'linux') {
		return Path.join(homedir(), '.local', 'share');
	}

	throw new Error(`Platform ${platform} not supported`);
};

const getUserCacheDir = async (): Promise<string> => {
	const platform = process.platform;

	const cacheDir = process.env.XDG_CACHE_HOME ?? null;
	if (cacheDir) {
		return cacheDir;
	}

	if (platform === 'win32') {
		const dir = process.env.LOCALAPPDATA || '';
		if (dir === '') {
			return Path.join(homedir(), 'AppData', 'Local', 'Caches');
		}
		return Path.join(dir, 'Temp');
	}

	if (platform === 'darwin') {
		return Path.join(homedir(), 'Library', 'Caches');
	}

	if (platform === 'linux') {
		return Path.join(homedir(), '.cache');
	}

	throw new Error(`Platform ${platform} not supported`);
};

const getUserConfigDir = async (): Promise<string> => {
	const platform = process.platform;

	const configDir = process.env.XDG_CONFIG_HOME ?? null;
	if (configDir) {
		return configDir;
	}

	if (platform === 'win32') {
		const dir = process.env.APPDATA || '';
		if (dir === '') {
			return Path.join(homedir(), 'AppData', 'Roaming');
		}
		return dir;
	}

	if (platform === 'darwin') {
		return Path.join(homedir(), 'Library', 'Preferences');
	}

	if (platform === 'linux') {
		return Path.join(homedir(), '.config');
	}
	throw new Error(`Platform ${platform} not supported`);
};

/**
 * Node environment. This typically will be running on a workstation or server
 */
export const FsBackend: () => Future.FutureOptional<Backend> = async () => {
	const dataStore = new Storage.FsStorage(await getUserDataDir()).child(
		'knut',
	);
	const stateStore = new Storage.FsStorage(await getUserStateDir()).child(
		'knut',
	);
	const configStore = new Storage.FsStorage(await getUserConfigDir()).child(
		'knut',
	);
	const cacheStore = new Storage.FsStorage(await getUserCacheDir()).child(
		'knut',
	);
	const loader: Loader = async (kegAlias, config) => {
		const stateConf = pipe(
			await KnutConfigFile.fromStorage(stateStore),
			Result.getOrElse(() => KnutConfigFile.create(stateStore.uri)),
		);
		const userConf = pipe(
			await KnutConfigFile.fromStorage(configStore),
			Result.getOrElse(() => KnutConfigFile.create(dataStore.uri)),
		);
		const conf = stateConf.merge(userConf);
		const path = conf.getKeg(kegAlias)?.url;
		if (Optional.isNone(path)) {
			return Result.err(
				BackendError.loaderError({
					kegAlias: kegAlias,
					message: `Keg alias ${kegAlias} not found.`,
				}),
			);
		}
		const storage = new Storage.FsStorage(path);
		return Result.ok(storage);
	};

	return make({
		cache: cacheStore,
		data: dataStore,
		state: stateStore,
		config: configStore,
		loader,
	});
};
