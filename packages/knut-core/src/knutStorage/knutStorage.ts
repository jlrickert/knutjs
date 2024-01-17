import { Stringer, currentEnvironment } from '../utils.js';
import { KnutSystemStorage } from './systemStorage.js';
import { KnutWebStorage } from './index.js';

export type KnutStorage = {
	readConfig(filepath: string): Promise<string | null>;
	writeConfig(filepath: string, contents: string | Stringer): Promise<void>;
	readVar(filepath: string): Promise<string | null>;
	writeVar(filepath: string, contents: string | Stringer): Promise<void>;
	readCache(filepath: string): Promise<string | null>;
	writeCache(filepath: string, contents: string | Stringer): Promise<void>;
};

export const loadKnutStorage = async (): Promise<KnutStorage> => {
	switch (currentEnvironment) {
		case 'dom': {
			return new KnutWebStorage();
		}
		case 'node': {
			return KnutSystemStorage.create();
		}
		default: {
			throw new Error('Unknown environment');
		}
	}
};
