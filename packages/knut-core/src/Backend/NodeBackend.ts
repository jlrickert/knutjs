import * as Path from 'path';
import { homedir } from 'os';
import { Storage } from '../Storage/index.js';
import { Future, Optional } from '../Utils/index.js';
import { Backend, createBackend, Loader } from './Backend.js';
import { pipe } from 'effect';
import { sequenceS } from 'fp-ts/lib/Apply.js';

const getUserVarDir = async (): Promise<string> => {
	const platform = process.platform;

	const dataDir = process.env.XDG_DATA_HOME ?? null;
	if (dataDir) {
		return dataDir;
	}

	if (platform === 'win32') {
		const dir = process.env.LOCALAPPDATA || '';
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

const getUserCacheDir = async (): Promise<string> => {
	const platform = process.platform;

	const cacheDir = process.env.XDG_CACHE_HOME ?? null;
	if (cacheDir) {
		return cacheDir;
	}

	if (platform === 'win32') {
		const dir = process.env.LOCALAPPDATA || '';
		if (dir === '') {
			return Path.join(homedir(), 'AppData', 'Local');
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
 **/
export const nodeBackend: () => Future.OptionalFuture<Backend> = async () => {
	const cache = new Storage.NodeStorage(await getUserCacheDir()).child(
		'knut',
	);
	const variable = new Storage.NodeStorage(await getUserVarDir()).child(
		'knut',
	);
	const config = new Storage.NodeStorage(await getUserConfigDir()).child(
		'knut',
	);
	const loader: Loader = async (uri) => {
		const storage = new Storage.NodeStorage(uri);
		return storage;
	};
	createBackend({ cache, config, variable, loader });
	const backend = pipe(
		sequenceS(Optional.Monad)({ cache, config, variable }),
		Optional.map(({ variable, config, cache }) =>
			createBackend({
				cache,
				config,
				variable,
				loader,
			}),
		),
	);
	return backend;
};
