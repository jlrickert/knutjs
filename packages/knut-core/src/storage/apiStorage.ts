import * as Path from 'path';
import { Stringer, stringify } from '../utils.js';
import { StorageTrait, createStorage } from './StorageTypes.js';
import { pipe } from 'effect';

export const ApiStorage = (url: string) => {
	const notImplemented = async () => {
		throw new Error('Method not implemented.');
	};
	return createStorage('api', {
		root: url,
		read: notImplemented,
		readdir: notImplemented,
		write: notImplemented,
		rm: notImplemented,
		rmdir: notImplemented,
		utime: notImplemented,
		mkdir: notImplemented,
		stats: notImplemented,
		child: (subpath: Stringer) => {
			const storage = pipe(
				stringify(subpath),
				(p) => Path.join(url, p),
				(p) => Path.normalize(p),
				(p) => ApiStorage(p),
			);
			return storage;
		},
	});
};
