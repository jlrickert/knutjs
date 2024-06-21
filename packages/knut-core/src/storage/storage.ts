import invariant from 'tiny-invariant';
import { TimeLike } from 'fs';
import { Stringer } from '../utils.js';
import { Future, Optional } from '../internal/index.js';
import { StorageTrait } from './StorageTypes.js';
import { NodeStorage } from './nodeStorage.js';
import { ApiStorage } from './apiStorage.js';
import { WebStorage } from './webStorage.js';
// import { NodeStorage } from './NodeStorage.js';

// export type NodeTime = {
// 	/**
// 	 * modified time
// 	 **/
// 	mtime?: TimeLike;
//
// 	/**
// 	 * last accessed time. This is when a file or directory was last read
// 	 **/
// 	atime?: TimeLike;
//
// 	/**
// 	 * changed time. This is when metadata is changed
// 	 */
// 	ctime?: TimeLike;
//
// 	/**
// 	 * birth time. Time when the file was last created
// 	 **/
// 	btime?: TimeLike;
// };
//
// export type NodeStats = NodeTime & {
// 	isDirectory(): boolean;
// 	isFile(): boolean;
// };
//
// type StorageFeature = 'read' | 'write' | 'upload';
// type StorageFeatureList = StorageFeature[];

export class Storage {
	// static node(root: string) {
	// 	return new NodeStorage(root);
	// }
	static overwrite = async (
		src: StorageTrait,
		dest: StorageTrait,
	): Future.Future<void> => {
		const pathList = await src.readdir('');
		if (Optional.isNone(pathList)) {
			return;
		}
		for (const path of pathList) {
			const stats = await src.stats(path);
			invariant(stats, 'Expect readdir to only list items that exist');
			if (stats.isDirectory()) {
				await dest.mkdir(path);
				await Storage.overwrite(src.child(path), dest.child(path));
			} else if (stats.isFile()) {
				const content = await src.read(path);
				invariant(content, 'Expect readdir to list a valid file');
				await dest.write(path, content);
			} else {
				throw new Error('Unhandled node type');
			}
		}
	};
}
