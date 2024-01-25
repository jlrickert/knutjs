import { NodeId } from '../node.js';
import { Stringer } from '../utils.js';
import { StorageNodeStats, KegStorage } from './kegStorage.js';

export type ApiStorageOptions = {
	url: string;
};

export class ApiStorage implements KegStorage {
	constructor(options: ApiStorageOptions) {}
	read(filepath: string | Stringer): Promise<string | null> {
		throw new Error('Method not implemented.');
	}
	write(
		filepath: string | Stringer,
		contents: string | Stringer,
	): Promise<void> {
		throw new Error('Method not implemented.');
	}
	stats(filepath: string): Promise<StorageNodeStats | null> {
		throw new Error('Method not implemented.');
	}
	listNodes(): Promise<NodeId[]> {
		throw new Error('Method not implemented.');
	}
}
