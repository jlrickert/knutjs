import { NodeId } from '../node.js';
import { Stringer, currentEnvironment } from '../utils.js';
import { ApiStorage } from './apiStorage.js';
import { KegSystemStorage } from './systemStorage.js';
import { WebStorage } from './webStorage.js';

export type KegMergeable = {
	merge(storage: KegStorage): Promise<void>;
};

export type GenericStorage = {
	read(filepath: string | Stringer): Promise<string | null>;
	write(
		filepath: string | Stringer,
		contents: string | Stringer,
		stats?: StorageNodeStats,
	): Promise<void>;
	stats(filepath: string): Promise<StorageNodeStats | null>;
	child(subpath: string | Stringer): KegStorage;
};

export type KegStorage = GenericStorage & {
	listNodes(): Promise<NodeId[]>;
};

export type StorageNodeStats = {
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
