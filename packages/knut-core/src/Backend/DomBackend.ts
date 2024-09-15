import { WebStorage } from '../Storage/index.js';
import { Backend, make, Loader } from './Backend.js';
import { Future, Result } from '../Utils/index.js';

export const browserBackend: () => Future.Future<Backend> = async () => {
	const storage = WebStorage.create('knut');
	const cache = storage.child('cache');
	const data = storage.child('data');
	const state = storage.child('state');
	const config = storage.child('config');
	const loader: Loader = async (uri: string) => {
		const storage = WebStorage.create('knut-kegs').child(uri);
		return Result.ok(storage);
	};
	return make({ state, loader, data, config, cache });
};
