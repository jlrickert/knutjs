import { currentPlatform } from '../Utils/Utils.js';
import { browserBackend } from './DomBackend.js';
import { memoryBackend } from './MemoryBackend.js';
import { FsBackend } from './FsBackend.js';

export * as Backend from './Backend.js';
export * as BackendError from './BackendError.js';

export { apiBackend } from './ApiBackend.js';
export { browserBackend } from './DomBackend.js';
export { memoryBackend } from './MemoryBackend.js';
export { FsBackend } from './FsBackend.js';

export const detectBackend = async () => {
	switch (currentPlatform) {
		case 'dom': {
			return browserBackend();
		}
		case 'node': {
			return FsBackend();
		}
		default: {
			return memoryBackend();
		}
	}
};
