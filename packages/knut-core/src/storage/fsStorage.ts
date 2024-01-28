import { Stringer, now, stringify } from '../utils.js';
import { GenericStorage, StorageNodeStats } from './storage.js';
import * as Path from 'path';
import { readFile, writeFile, readdir, stat, utimes } from 'fs/promises';
import invariant from 'tiny-invariant';

export class FsStorage implements GenericStorage {
	constructor(private root: string) {}

	async read(filepath: string | Stringer): Promise<string | null> {
		const path = Path.join(this.root, stringify(filepath));
		try {
			const content = await readFile(path, { encoding: 'utf-8' });
			return content;
		} catch (error) {
			return null;
		}
	}

	async write(
		filepath: string | Stringer,
		contents: string | Stringer,
		stats?: StorageNodeStats | undefined,
	): Promise<void> {
		const data =
			typeof contents === 'string' ? contents : contents.stringify();
		try {
			const path = Path.join(this.root, stringify(filepath));
			await writeFile(path, data, 'utf-8');
			if (stats?.atime && stats.mtime) {
				await this.utime(path, stats);
			}
		} catch (error) {
			return;
		}
	}

	async utime(path: string, stats: StorageNodeStats): Promise<void> {
		const atime = stats.atime ?? now('Y-m-D H:M');
		const currentStats = await stat(path);
		if (!currentStats) {
			return;
		}
		const atime = stringify(currentStats.atime) ?? stats.atime;
		await utimes(path, atime, stats.mtime);
	}

	async readdir(dirpath: string): Promise<string[]> {
		return readdir(Path.join(this.root, dirpath));
	}
	async mkdir(
		dirpath: Stringer,
		stats?: StorageNodeStats | undefined,
	): Promise<void> {
		return;
	}

	async stats(filepath: string): Promise<StorageNodeStats | null> {
		const path = Path.join(this.root, filepath);
		try {
			const { mtime, atime } = await stat(path);
			return {
				mtime: mtime.toString(),
				atime: atime.toString(),
			};
		} catch (error) {
			return null;
		}
	}

	child(subpath: string | Stringer): GenericStorage {
		return new FsStorage(Path.join(this.root, stringify(subpath)));
	}
}
