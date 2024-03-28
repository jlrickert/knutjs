import { createGlobalStore } from './createGlobalStore';

export type GlobalState = {};

const make = (state: GlobalState): GlobalState => {
	return state;
};

const rootState = createGlobalStore({});

export const global = {};
