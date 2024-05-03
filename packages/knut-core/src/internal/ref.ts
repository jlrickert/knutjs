export interface Ref<T> {
	current: T;
}

export const make = <T>(obj: T): Ref<T> => ({
	current: obj,
});

export const tap =
	<T>(f: (obj: T) => T) =>
	(ma: Ref<T>) => {
		f(ma.current);
	};
