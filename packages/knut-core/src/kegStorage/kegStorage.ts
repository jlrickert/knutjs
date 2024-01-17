import { Stringer, currentEnvironment } from '../utils.js';
import { ApiStorage } from './apiStorage.js';
import { KegSystemStorage } from './systemStorage.js';
import { WebStorage } from './webStorage.js';

export type KegStorage = {
	read(filepath: string): Promise<string | null>;
	write(filepath: string | Stringer, contents: string): Promise<void>;
	stats(filepath: string): Promise<KegFsStats | null>;
};

export type KegFsStats = {
	mtime: string;
};

export const loadKegStorage = (url: string) => {
	if (url.match(/^https?/)) {
		return new ApiStorage({ url });
	}
	switch (currentEnvironment) {
		case 'dom': {
			return new WebStorage('knut');
		}
		case 'node': {
			return new KegSystemStorage({ kegpath: url });
		}
		default: {
			throw new Error('Unknown environment');
		}
	}
};
