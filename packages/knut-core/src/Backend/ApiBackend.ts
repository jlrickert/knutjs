import { KegStorage } from '../kegStorage.js';
import { ApiStorage } from '../Storage/index.js';
import { Future, Optional } from '../Utils/index.js';
import { Backend, createBackend, Loader } from './Backend.js';

export const apiBackend: (
	uri: string,
) => Future.OptionalFuture<Backend> = async (rootUri) => {
	const storage = new ApiStorage(rootUri);
	const cache = storage.child('platform').child('cache');
	const variable = storage.child('platform').child('variables');
	const config = storage.child('platform').child('config');
	if (Optional.isNone(storage)) {
		return Optional.none;
	}
	const loader: Loader = async (uri) => {
		const store = storage.child(`${rootUri}/${uri}`);
		return KegStorage.fromStorage(store);
	};
	return createBackend({
		variable,
		config,
		cache,
		loader,
	});
};
