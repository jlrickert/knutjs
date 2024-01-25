import * as Path from 'path';
import { readFile, writeFile, readdir, stat } from 'fs/promises';

import { StorageNodeStats, KegStorage } from './kegStorage.js';
import { Stringer, stringify } from '../utils.js';
import { NodeId } from '../node.js';

export type KegSystemStorageOptions = { kegpath: string };
export class KegSystemStorage implements KegStorage {
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
	static async findNearestKegpath(rootDir?: string): Promise<string | null> {
		// Look for a child keg from root
		let root: string | null = rootDir ?? process.cwd();
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
		root = rootDir ?? process.cwd();
		if (root === '/') {
			return null;
		}
		this.findNearestKegpath(Path.dirname(root));
		return null;
	}

	static async findNearest(): Promise<KegStorage | null> {
		const env = process.env.KEG_CURRENT;
		const exists = async (filepath: string): Promise<boolean> => {
			const stats = await stat(filepath);
			return stats.isFile();
		};

		// Check for a keg file in KEG_CURRENT
		if (env) {
			try {
				const path = Path.join(env, 'keg');
				if (await exists(path)) {
					return new KegSystemStorage({ kegpath: env });
				}
			} catch (e) {
				// TODO: Add some sort of warning here
				return null;
			}
		}

		const kegpath = await KegSystemStorage.findNearestKegpath();
		if (kegpath === null) {
			return null;
		}
		const storage = new KegSystemStorage({ kegpath });
		return storage;
	}

	public readonly kegpath: string;
	public constructor(options: KegSystemStorageOptions) {
		this.kegpath = Path.resolve(options.kegpath);
	}

	child(subpath: string | Stringer): KegStorage {
		return new KegSystemStorage({
			kegpath: `${this.kegpath}/${stringify(subpath)}`,
		});
	}

	async listNodes(): Promise<NodeId[]> {
		const fileList = await readdir(this.kegpath);
		const nodeList: NodeId[] = [];
		for (const filepath of fileList) {
			const nodeId = NodeId.parse(filepath);
			if (nodeId) {
				nodeList.push(nodeId);
			}
		}
		nodeList.sort((a, b) => {
			return a.gt(b) ? 1 : -1;
		});
		return nodeList;
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

	async stats(filepath: string): Promise<StorageNodeStats | null> {
		const path = Path.join(this.kegpath, filepath);
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
}
