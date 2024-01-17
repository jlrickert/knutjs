import { Stringer } from '../utils.js';
import { KnutStorage } from './knutStorage.js';

export type KnutMemoryStorageOptions = {};

export class KnutMemoryStorage implements KnutStorage {
	private cache = new Map<string, string>();
	private data = new Map<string, string>();
	private config = new Map<string, string>();

	constructor(options?: KnutMemoryStorageOptions) {}

	async readConfig(filepath: string): Promise<string | null> {
		return this.config.get(filepath) ?? null;
	}

	async writeConfig(
		filepath: string,
		contents: string | Stringer,
	): Promise<void> {
		const content =
			typeof contents === 'string' ? contents : contents.stringify();
		this.config.set(filepath, content);
	}

	async readVar(filepath: string): Promise<string | null> {
		return this.data.get(filepath) ?? null;
	}

	async writeVar(
		filepath: string,
		contents: string | Stringer,
	): Promise<void> {
		const content =
			typeof contents === 'string' ? contents : contents.stringify();
		this.data.set(filepath, content);
	}

	async readCache(filepath: string): Promise<string | null> {
		return this.cache.get(filepath) ?? null;
	}
	async writeCache(
		filepath: string,
		contents: string | Stringer,
	): Promise<void> {
		const content =
			typeof contents === 'string' ? contents : contents.stringify();
		this.cache.set(filepath, content);
	}
}
