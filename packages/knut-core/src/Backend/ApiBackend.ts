import { ApiStorage } from '../Storage/index.js';
import { Future, Optional, Result } from '../Utils/index.js';
import { Backend, make, Loader } from './Backend.js';

export const apiBackend: (
	uri: string,
) => Future.FutureOptional<Backend> = async (rootUri) => {
	const storage = new ApiStorage(rootUri);
	const cache = storage.child('platform').child('cache');
	const data = storage.child('platform').child('data');
	const state = storage.child('platform').child('state');
	const config = storage.child('platform').child('config');
	if (Optional.isNone(storage)) {
		return Optional.none;
	}
	const loader: Loader = async (uri) => {
		const store = storage.child(`${rootUri}/${uri}`);
		return Result.ok(store);
	};
	return make({
		data,
		state,
		config,
		cache,
		loader,
	});
};
