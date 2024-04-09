import { Knut } from '@jlrickert/knutjs-core';
import { createGlobalStore } from './utils/createGlobalStore';

export type GlobalState = {
	user: string | null;
	knut: Knut | null;
};

const make = (state: GlobalState): GlobalState => {
	return state;
};

const store = createGlobalStore<GlobalState>({
	user: null,
	knut: null,
});

export const useKnut = (): Knut => {
	const [knut] = store.use('knut');
	if (knut === null) {
		throw new Error('Expected to be use within a Knut provider');
	}
	return knut;
};

export default store;
