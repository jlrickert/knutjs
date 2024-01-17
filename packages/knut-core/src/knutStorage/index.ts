import { loadKnutStorage, type KnutStorage } from './knutStorage.js';
import { Stringer } from '../utils.js';

export { type KnutStorage } from './knutStorage.js';
export { loadKnutStorage };

export {
	KnutSystemStorage,
	type KnutSystemStorageOptions,
} from './systemStorage.js';

export {
	KnutMemoryStorage,
	type KnutMemoryStorageOptions,
} from './memoryStorage.js';

export class KnutApiStorage implements KnutStorage {
	readConfig(filepath: string): Promise<string | null> {
		throw new Error('Method not implemented.');
	}
	writeConfig(filepath: string, contents: string | Stringer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	readVar(filepath: string): Promise<string | null> {
		throw new Error('Method not implemented.');
	}
	writeVar(filepath: string, contents: string | Stringer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	readCache(filepath: string): Promise<string | null> {
		throw new Error('Method not implemented.');
	}
	writeCache(filepath: string, contents: string | Stringer): Promise<void> {
		throw new Error('Method not implemented.');
	}
}

export class KnutWebStorage implements KnutStorage {
	readConfig(filepath: string): Promise<string | null> {
		throw new Error('Method not implemented.');
	}
	writeConfig(filepath: string, contents: string | Stringer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	readVar(filepath: string): Promise<string | null> {
		throw new Error('Method not implemented.');
	}
	writeVar(filepath: string, contents: string | Stringer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	readCache(filepath: string): Promise<string | null> {
		throw new Error('Method not implemented.');
	}
	writeCache(filepath: string, contents: string | Stringer): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
