import { MemoryStore } from '../Store/index.js';
import { Future, Result } from '../Utils/index.js';
import { Backend } from './index.js';

export const memoryBackend: () => Future.Future<Backend.Backend> = async () => {
	const root = MemoryStore.memoryStore();
	const data = root.child('data');
	const state = root.child('state');
	const config = root.child('config');
	const cache = root.child('cache');
	return Backend.make({
		cache,
		config,
		data,
		state,
		loader: async ({ uri }) => {
			return Result.ok(root.child(uri));
		},
	});
};
