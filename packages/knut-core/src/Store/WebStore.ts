import { Path } from '../Data/index.js';
import { MemoryFs } from '../Data/MemoryFs.js';
import { currentPlatform, Result } from '../Utils/index.js';
import { Store } from './index.js';

export const WEB_STORE = 'WEB_STORE';

declare module './Store.js' {
	interface StoreTypeMap {
		WEB_STORE: typeof WEB_STORE;
	}
}

function getWindow() {
	if (currentPlatform !== 'dom') {
		throw new Error('WebStorage not supported');
	}
	// @ts-ignore
	return window;
}

export function webStore(options: {
	pwd?: string;
	uri?: string;
	content?: string;
}): Store.Store {
	const content = options?.content;
	const pwd = options?.pwd ?? '/';
	const uri = options?.uri ?? 'knut-webfs';
	const memory = content
		? Result.getOrElse(MemoryFs.parse(content), () => MemoryFs.empty(pwd))
		: MemoryFs.empty(pwd);

	/**
	 * Every operation on memory fs should be synced to local storage as metadata is updated
	 */
	function save() {
		const data = memory.toJson();
		const window = getWindow();
		window.localStorage.setItem(uri, data);
		return void {};
	}

	return Store.make((context) => {
		function resolve(path: string) {
			return Path.resolve(context.pwd, path);
		}
		return {
			uri,
			storageType: 'WEB_STORE',
			async mkdir(path, options) {
				const result = memory.mkdir(resolve(path), options);
				save();
				return result;
			},
			async read(path) {
				const result = memory.read(resolve(path));
				save();
				return result;
			},
			async readdir(path, options) {
				const resolvedPath = resolve(path);
				const result = memory.readdir(resolvedPath);
				save();

				if (Result.isErr(result)) {
					return result;
				}
				return Result.map(result, (list) => {
					return list.map((child) => {
						return Path.resolve(
							'',
							Path.relative(resolvedPath, child),
						).slice(1);
					});
				});
			},
			async rm(path, options) {
				const result = memory.rm(resolve(path), options);
				save();
				return result;
			},
			async rmdir(path, options) {
				const result = memory.rmdir(resolve(path), {
					recursive: options?.recusive,
				});
				save();
				return result;
			},
			async stats(path) {
				const result = memory.stats(resolve(path));
				save();
				return result;
			},
			async utime(path, stats) {
				const result = memory.utime(resolve(path), stats);
				save();
				return result;
			},
			async write(path, content, options) {
				const result = memory.write(resolve(path), content, {
					recursive: options?.recurive,
				});
				save();
				return result;
			},
		};
	});
}
