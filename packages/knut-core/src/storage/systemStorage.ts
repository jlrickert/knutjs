import * as Path from 'path';
import { readFile, writeFile, readdir, stat } from 'fs/promises';

import { KegFsStats, KegStorage } from './storage.js';
import { Stringer } from '../utils.js';

export type SystemStorageOptions = { kegpath: string };
export class SystemStorage implements KegStorage {
	/**
	 * Finds the nearest keg file. Here is where it will look for in order
	 * of higher precendence to lowest:
	 *
	 * - $KEG_CURRENT/keg
	 * - $KEG_CURRENT/docs/keg
	 * - ./keg
	 * - ./docs/keg
	 * - <git repo>/keg
	 * - <git repo>/docs/keg
	 */
	static async findNearestKegpath(): Promise<string | null> {
		const env = process.env.KEG_CURRENT;
		const exists = async (filepath: string): Promise<boolean> => {
			const stats = await stat(filepath);
			return stats.isFile();
		};
		if (env) {
			try {
				const path = Path.join(env, 'keg');
				if (await exists(path)) {
					return Path.dirname(path);
				}
			} catch (e) {}
			try {
				const path = Path.join(env, 'docs', 'keg');
				if (await exists(path)) {
					return Path.dirname(path);
				}
			} catch (e) {}
		}

		// Look for a child keg from root
		let root: string | null = process.cwd();
		const thingsToCheck: string[] = [];
		while (root) {
			let dirs = await readdir(root);
			for (const file of dirs) {
				if (file === 'keg') {
					return root;
				}

				// add child directory to list of things to check
				const path = Path.join(root, file);
				const s = await stat(path);
				if (s.isDirectory()) {
					thingsToCheck.push(path);
				}
			}
			root = thingsToCheck.shift() ?? null;
		}
		return null;
	}

	static async findNearest(): Promise<KegStorage | null> {
		const kegpath = await SystemStorage.findNearestKegpath();
		if (kegpath === null) {
			return null;
		}
		const storage = new SystemStorage({ kegpath });
		return storage;
	}

	public readonly kegpath: string;
	public constructor(options: SystemStorageOptions) {
		this.kegpath = options.kegpath;
	}

	async listIndexPaths(): Promise<string[] | null> {
		const dexDir = Path.join(this.kegpath, 'dex');
		const fileList = await readdir(dexDir);
		return fileList;
	}

	async listNodePaths(): Promise<string[] | null> {
		const dirs = await readdir(this.kegpath);
		return dirs.filter((dir) => {
			return !(dir.includes('keg') || dir.includes('dex'));
		});
	}
	async read(filepath: string): Promise<string | null> {
		const path = Path.join(this.kegpath, filepath);
		try {
			const content = await readFile(path, { encoding: 'utf-8' });
			return content;
		} catch (error) {
			return null;
		}
	}
	async write(filepath: string, contents: string | Stringer): Promise<void> {
		const data =
			typeof contents === 'string' ? contents : contents.stringify();
		try {
			const path = Path.join(this.kegpath, filepath);
			writeFile(path, data, 'utf-8');
		} catch (error) {
			return;
		}
	}

	async stats(filepath: string): Promise<KegFsStats | null> {
		const path = Path.join(this.kegpath, filepath);
		try {
			const stats = await stat(path);
			return {
				mtime: stats.mtime.toString(),
			};
		} catch (error) {
			return null;
		}
	}
}
