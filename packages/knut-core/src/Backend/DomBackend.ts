import { WebStorage } from '../Storage/index.js';
import { Backend, createBackend, Loader } from './Backend.js';
import { Future } from '../Utils/index.js';

export const browserBackend: () => Future.Future<Backend> = async () => {
	const storage = WebStorage.create('knut');
	const cache = storage.child('cache');
	const variable = storage.child('variables');
	const config = storage.child('config');
	const loader: Loader = async (uri: string) => {
		const storage = WebStorage.create('knut-kegs').child(uri);
		return storage;
	};
	return createBackend({ loader, variable, config, cache });
};
