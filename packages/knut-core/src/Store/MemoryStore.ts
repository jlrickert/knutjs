import { MemoryFs, Path } from '../Data/index.js';
import { Result } from '../Utils/index.js';
import { Store } from './index.js';

declare module './Store.js' {
	interface StoreTypeMap {
		MEMORY: 'memory';
	}
}

export function memoryStore(options?: {
	pwd?: string;
	uri?: string;
	content?: string;
}): Store.Store {
	const content = options?.content;
	const pwd = options?.pwd ?? '/';
	const uri = options?.uri ?? 'memory-fs';
	const memory = content
		? Result.getOrElse(MemoryFs.parse(content), () => MemoryFs.empty(pwd))
		: MemoryFs.empty(pwd);
	return Store.make(
		(context) => {
			function resolve(path: string) {
				return Path.resolve(context.pwd, path);
			}
			return {
				uri,
				storageType: 'MEMORY',
				read: async (path) => {
					return memory.read(resolve(path));
				},
				write: async (path, content) => {
					return memory.write(resolve(path), content);
				},
				rm: async (path, options) => {
					const ok = memory.rm(resolve(path), {
						recursive: options?.recursive,
					});
					return ok;
				},
				readdir: async (path) => {
					const resolvedPath = resolve(path);
					const list = memory.readdir(resolvedPath);
					if (Result.isErr(list)) {
						return list;
					}
					return Result.ok(
						list.value.map((child) => {
							return Path.resolve(
								'',
								Path.relative(resolvedPath, child),
							).slice(1);
						}),
					);
				},
				utime: async (path, stats) => {
					return memory.utime(resolve(path), stats);
				},
				stats: async (path) => {
					return memory.stats(resolve(path));
				},
				rmdir: async (path) => {
					return memory.rmdir(resolve(path));
				},
				mkdir: async (path) => {
					return memory.mkdir(resolve(path));
				},
			};
		},
		{ pwd },
	);
}
