import * as Path from 'path';
import { homedir } from 'os';
import { Future, Result } from '../Utils/index.js';
import { FsStore } from '../Store/index.js';
import { Backend } from './index.js';

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
export const fsBackend = async (
	jail?: string,
): Future.Future<Backend.Backend> => {
	const root = FsStore.fsStore(jail ?? '/', { jail });
	const dataStore = FsStore.fsStore(await getUserDataDir()).child('knut');
	const stateStore = FsStore.fsStore(await getUserStateDir()).child('knut');
	const configStore = FsStore.fsStore(await getUserConfigDir()).child('knut');

	const cacheStore = FsStore.fsStore(await getUserCacheDir()).child('knut');

	return Backend.make({
		cache: cacheStore,
		data: dataStore,
		state: stateStore,
		config: configStore,
		loader: async ({ uri }) => {
			return Result.ok(root.child(uri));
		},
	});
};
