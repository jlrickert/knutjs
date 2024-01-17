import * as Path from 'path';
import { readFile, writeFile } from 'fs/promises';
import {
	getUserCacheDir,
	getUserConfigDir,
	getUserDataDir,
} from '../internal/systemUtils.js';
import { KnutStorage } from './knutStorage.js';
import { Stringer } from '../utils.js';

export type KnutSystemStorageOptions = {
	configRoot: string;
	dataRoot: string;
	cacheRoot: string;
};

export class KnutSystemStorage implements KnutStorage {
	public readonly configRoot: string;
	public readonly dataRoot: string;
	public readonly cacheRoot: string;

	static async create(name = 'knut'): Promise<KnutSystemStorage> {
		const cacheDir = await getUserCacheDir();
		const dataDir = await getUserDataDir();
		const configDir = await getUserConfigDir();

		return new KnutSystemStorage({
			cacheRoot: Path.join(cacheDir, name),
			dataRoot: Path.join(dataDir, name),
			configRoot: Path.join(configDir, name),
		});
	}

	constructor(options: KnutSystemStorageOptions) {
		this.cacheRoot = options.cacheRoot;
		this.dataRoot = options.dataRoot;
		this.configRoot = options.configRoot;
	}

	async readConfig(filepath: string): Promise<string | null> {
		return this.read(this.configRoot, filepath);
	}

	async writeConfig(
		filepath: string,
		contents: string | Stringer,
	): Promise<void> {
		return this.write(this.configRoot, filepath, contents);
	}

	async readVar(filepath: string): Promise<string | null> {
		return this.read(this.dataRoot, filepath);
	}

	async writeVar(
		filepath: string,
		contents: string | Stringer,
	): Promise<void> {
		return this.write(this.dataRoot, filepath, contents);
	}

	async readCache(filepath: string): Promise<string | null> {
		return this.read(this.cacheRoot, filepath);
	}

	async writeCache(
		filepath: string,
		contents: string | Stringer,
	): Promise<void> {
		return this.write(this.cacheRoot, filepath, contents);
	}

	private async read(root: string, filepath: string): Promise<string | null> {
		try {
			const content = await readFile(Path.join(root, filepath), {
				encoding: 'utf-8',
			});
			return content;
		} catch (error) {
			return null;
		}
	}

	private async write(
		root: string,
		filepath: string,
		contents: string | Stringer,
	): Promise<void> {
		const data =
			typeof contents === 'string' ? contents : contents.stringify();
		try {
			const path = Path.join(root, filepath);
			await writeFile(path, data, 'utf-8');
		} catch (error) {
			return;
		}
	}
}
