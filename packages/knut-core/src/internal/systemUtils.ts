// import * as Path from 'path';
// import { homedir } from 'os';
//
// export const getUserVarDir = async (): Promise<string> => {
// 	const platform = process.platform;
//
// 	const dataDir = process.env.XDG_DATA_HOME ?? null;
// 	if (dataDir) {
// 		return dataDir;
// 	}
//
// 	if (platform === 'win32') {
// 		const dir = process.env.LOCALAPPDATA || '';
// 		if (dir === '') {
// 			return Path.join(homedir(), 'AppData', 'Local');
// 		}
// 		return dir;
// 	}
//
// 	if (platform === 'darwin') {
// 		return Path.join(homedir(), 'Library', 'Application Support');
// 	}
//
// 	if (platform === 'linux') {
// 		return Path.join(homedir(), '.local', 'share');
// 	}
//
// 	throw new Error(`Platform ${platform} not supported`);
// };
//
// export const getUserCacheDir = async (): Promise<string> => {
// 	const platform = process.platform;
//
// 	const cacheDir = process.env.XDG_CACHE_HOME ?? null;
// 	if (cacheDir) {
// 		return cacheDir;
// 	}
//
// 	if (platform === 'win32') {
// 		const dir = process.env.LOCALAPPDATA || '';
// 		if (dir === '') {
// 			return Path.join(homedir(), 'AppData', 'Local');
// 		}
// 		return Path.join(dir, 'Temp');
// 	}
//
// 	if (platform === 'darwin') {
// 		return Path.join(homedir(), 'Library', 'Caches');
// 	}
//
// 	if (platform === 'linux') {
// 		return Path.join(homedir(), '.cache');
// 	}
//
// 	throw new Error(`Platform ${platform} not supported`);
// };
//
// export const getUserConfigDir = async (): Promise<string> => {
// 	const platform = process.platform;
//
// 	const configDir = process.env.XDG_CONFIG_HOME ?? null;
// 	if (configDir) {
// 		return configDir;
// 	}
//
// 	if (platform === 'win32') {
// 		const dir = process.env.APPDATA || '';
// 		if (dir === '') {
// 			return Path.join(homedir(), 'AppData', 'Roaming');
// 		}
// 		return dir;
// 	}
//
// 	if (platform === 'darwin') {
// 		return Path.join(homedir(), 'Library', 'Preferences');
// 	}
//
// 	if (platform === 'linux') {
// 		return Path.join(homedir(), '.config');
// 	}
// 	throw new Error(`Platform ${platform} not supported`);
// };
