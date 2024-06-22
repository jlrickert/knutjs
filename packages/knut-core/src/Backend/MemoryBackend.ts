import { MemoryStorage } from "../Storage/index.js";
import { Future } from "../Utils/index.js";
import { Backend, Loader } from "./Backend.js";

export const memoryBackend: () => Future.Future<Backend> = async () => {
	const storage = MemoryStorage.create();
	const cache = storage.child('cache');
	const variable = storage.child('variables');
	const config = storage.child('config');
	const loader: Loader = async (uri: string) => {
		const store = storage.child(uri);
		return store;
	};
	return { storage, cache, config, variable, loader };
};
