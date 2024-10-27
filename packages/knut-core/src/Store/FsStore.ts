import { homedir } from 'os';
import * as FS from 'fs/promises';
import { Store } from './index.js';
import { NodeId, Path } from '../Data/index.js';
import { Future, Result } from '../Utils/index.js';
import { StorageError } from '../Storage/index.js';

export const FILE_SYSTEM_STORE = 'FILE_SYSTEM';

declare module './Store.js' {
	interface StoreTypeMap {
		FILE_SYSTEM: typeof FILE_SYSTEM_STORE;
	}
}

/**
 * creates a File System store
 *
 * @param string uri is an absolute unix path.
 */
export function fsStore(uri: string, options?: { jail?: string }): Store.Store {
	const jail = options?.jail ?? uri;
	const home = homedir();
	return Store.make(
		(context) => {
			const fixedPwd = context.pwd.startsWith('~')
				? `${home}/${context.pwd.slice(1)}`
				: context.pwd;
			const resolve = (path: string) => {
				let fixedPath = path.startsWith('~')
					? `${home}/${path.slice(1)}`
					: path;
				const jailedPath = Path.resolveWithinJail({
					jail,
					basePath: fixedPwd,
					path: fixedPath,
				});
				return jailedPath;
			};
			return {
				uri,
				storageType: FILE_SYSTEM_STORE,
				async read(path) {
					const jailedPath = resolve(path);
					return Future.tryCatch(
						() => FS.readFile(jailedPath, { encoding: 'utf-8' }),
						(error) => {
							if ((error as any).code === 'ENOENT') {
								return StorageError.fileNotFound({
									filename: jailedPath,
									storageType: this.storageType,
									error,
								});
							}
							return StorageError.uknownError({
								storageType: 'filesystem',
								reason: `Unable to read file "${jailedPath}"`,
								error,
							});
						},
					);
				},

				async readdir(path, options) {
					const jailedPath = resolve(path);
					try {
						const children = await FS.readdir(jailedPath);
						const list = children.sort((a, b) => {
							if (NodeId.isNumberic(a) && NodeId.isNumberic(b)) {
								return parseInt(a) - parseInt(b);
							}
							return a < b ? -1 : 1;
						});
						return Result.ok(list);
					} catch (error) {
						return Result.err(
							StorageError.uknownError({
								storageType: FILE_SYSTEM_STORE,
								reason: `unable to read directory "${jailedPath}"`,
								error,
							}),
						);
					}
				},
				async write(path, content, options) {
					const jailedPath = resolve(path);
					const recursive = options?.recurive ?? true;
					return Future.tryCatch<true, StorageError.StorageError>(
						async () => {
							const dirpath = Path.dirname(jailedPath);
							if (recursive) {
								await FS.mkdir(dirpath, { recursive: true });
							}
							await FS.writeFile(jailedPath, content, {
								encoding: 'utf-8',
							});
							return true;
						},
						(error) => {
							return StorageError.uknownError({
								storageType: 'fs',
								error,
							});
						},
					);
				},
				async rm(path, options) {
					const jailedPath = resolve(path);
					try {
						await FS.rm(jailedPath, {
							recursive: options?.recursive,
						});
						return Result.ok(true);
					} catch (error) {
						return Result.err(
							StorageError.uknownError({
								storageType: FILE_SYSTEM_STORE,
								reason: `Unable to remove file ${jailedPath}`,
								error,
							}),
						);
					}
				},
				async mkdir(path, options) {
					const jailedPath = resolve(path);
					try {
						await FS.mkdir(jailedPath, {
							recursive: options?.recursive,
						});
						return Result.ok(true);
					} catch (error) {
						return Result.err(
							StorageError.uknownError({
								storageType: FILE_SYSTEM_STORE,
								reason: `unable to mkdir "${jailedPath}"`,
								error,
							}),
						);
					}
				},
				async stats(path) {
					const jailedPath = resolve(path);
					try {
						const stats = await FS.stat(jailedPath);
						return Result.ok({
							atime: stats.atime,
							mtime: stats.mtime,
							btime: stats.birthtime,
							isDirectory() {
								return stats.isDirectory();
							},
							isFile() {
								return stats.isFile();
							},
						});
					} catch (error) {
						if ((error as any).code === 'ENOENT') {
							return Result.err(
								StorageError.pathNotFound({
									storageType: 'filesystem',
									path: jailedPath,
									message: 'Unable to fetch timestamps',
									error,
								}),
							);
						}
						return Result.err(
							StorageError.uknownError({
								storageType: 'filesystem',
								reason: `unable to stat ${jailedPath}`,
								error,
							}),
						);
					}
				},
				async utime(path, stats) {
					const jailedPath = resolve(path);
					try {
						const s = await FS.stat(jailedPath);
						const atime =
							stats.atime !== undefined ? stats.atime : s.atime;
						const mtime =
							stats.mtime !== undefined ? stats.mtime : s.mtime;
						await FS.utimes(jailedPath, atime, mtime);
						return Result.ok(true);
					} catch (error) {
						if ((error as any).code === 'ENOENT') {
							return Result.err(
								StorageError.pathNotFound({
									storageType: FILE_SYSTEM_STORE,
									path: jailedPath,
									message: 'Unable to modify timestamps',
									error,
								}),
							);
						}
						return Result.err(
							StorageError.uknownError({
								storageType: FILE_SYSTEM_STORE,
								reason: `unable to utime ${jailedPath}`,
								error,
							}),
						);
					}
				},
				async rmdir(path, options) {
					const jailedPath = resolve(path);
					try {
						await FS.rmdir(jailedPath, {
							recursive: options?.recusive,
						});
						return Result.ok(true);
					} catch (error) {
						return Result.err(
							StorageError.uknownError({
								storageType: FILE_SYSTEM_STORE,
								reason: `unable to rmdir "${jailedPath}"`,
								error,
							}),
						);
					}
				},
			};
		},
		{
			pwd: uri,
		},
	);
}
