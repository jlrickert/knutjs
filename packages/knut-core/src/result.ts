export type LoadError = {};
export type LoadResult<T> = [T, LoadError[] | null];
