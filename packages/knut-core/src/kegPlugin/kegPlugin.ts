import { Future } from '../internal/future.js';
import { Keg, KegEventHandler, KegEventMap, Subscription } from '../keg.js';

export type KegPlugin = {
	readonly name: string;
	init(keg: Keg): Future<void>;
	deinit(keg: Keg): Future<void>;
};

export const createKegPlugin = (
	name: string,
	f: (keg: Keg) => Future<
		Partial<{
			[E in keyof KegEventMap]: KegEventHandler<E>;
		}>
	>,
): KegPlugin => {
	let subs: Subscription[] = [];
	return {
		name,
		async init(keg) {
			const handlers = await f(keg);
			for (const k of Object.keys(handlers)) {
				type K = keyof KegEventMap;
				const h = handlers[k as K] as KegEventHandler<K>;
				const sub = keg.on(k as K, h);
				subs.push(sub);
			}
		},
		async deinit() {
			for (const sub of subs) {
				sub.unsub();
			}
			subs = [];
		},
	};
};
