import { MemoryStorage } from '../Storage/index.js';
import { Future, Result } from '../Utils/index.js';
import { Backend, Loader, make } from './Backend.js';

export const memoryBackend: () => Future.Future<Backend> = async () => {
	const storage = MemoryStorage.create();
	const data = storage.child('data');
	const state = storage.child('state');
	const config = storage.child('config');
	const cache = storage.child('cache');
	const loader: Loader = async (uri: string) => {
		const store = storage.child(uri);
		return Result.ok(store);
	};
	return make({ cache, config, data, state, loader });
};
