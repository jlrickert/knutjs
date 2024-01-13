import { currentEnvironment, isBrowser, isNode } from '../utils.js';
import { SystemStorage } from './systemStorage.js';
import { WebStorage } from './webStorage.js';

export type Stringer = {
	stringify: () => string;
};

export type KegStorage = {
	read(filepath: string): Promise<string | null>;
	write(filepath: string | Stringer, contents: string): Promise<void>;
	stats(filepath: string): Promise<KegFsStats | null>;
	listIndexPaths(): Promise<string[] | null>;
	listNodePaths(): Promise<string[] | null>;
};

export type KegFsStats = {
	mtime: string;
};

export const loadStorage = (kegpath: string) => {
	switch (currentEnvironment) {
		case 'dom': {
			return new WebStorage('knut');
		}
		case 'node': {
			return new SystemStorage({ kegpath });
		}
		default: {
			throw new Error('Unknown environment');
		}
	}
};
