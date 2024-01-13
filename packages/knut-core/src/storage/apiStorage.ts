import { KegFsStats, KegStorage, Stringer } from './storage.js';

export type ApiStorageOptions = {
	url: string;
};

export class ApiStorage implements KegStorage {
	constructor(options: ApiStorageOptions) {}

	listIndexPaths(): Promise<string[] | null> {
		throw new Error('Method not implemented.');
	}

	async listNodePaths(): Promise<string[] | null> {
		throw new Error('Method not implemented.');
	}
	async read(filepath: string): Promise<string | null> {
		return null;
	}
	async write(filepath: string, content: string | Stringer): Promise<void> {}

	async stats(filepath: string): Promise<KegFsStats | null> {
		return null;
	}
}
