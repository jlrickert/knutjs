import { Backend, make } from './Backend.js';
import { Future, Optional, Result } from '../Utils/index.js';
import { BackendError } from '../Data/index.js';
import { WebStore } from '../Store/index.js';

export const webBackend: () => Future.Future<Backend> = async () => {
	const store = WebStore.webStore({ uri: 'knut' });
	const cache = store.child('cache');
	const data = store.child('data');
	const state = store.child('state');
	const config = store.child('config');
	return make({
		state,
		data,
		config,
		cache,
		loader: async ({ uri, alias, knutConfig: config }) => {
			const kegConfig = config.getKeg(alias);
			if (Optional.isNone(kegConfig)) {
				return Result.err(
					BackendError.loaderError({
						uri,
						config,
						message: `Keg alias "${alias}" doesn't exist`,
					}),
				);
			}
			const storage = WebStore.webStore({ uri: 'knut-kegs' }).child(
				kegConfig.url,
			);
			return Result.ok(storage);
		},
	});
};
