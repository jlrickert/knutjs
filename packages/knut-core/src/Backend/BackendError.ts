import { BaseError } from '../Utils/index.js';

export interface LoaderError extends BaseError.BaseError<'BACKEND', 'LOADER'> {
	uri: string;
}

export type BackendError = LoaderError;

export const loaderError = (
	options: BaseError.BaseErrorArgs<{ uri: string }>,
) => {
	return BaseError.make<LoaderError>({
		scope: 'BACKEND',
		code: 'LOADER',
		...options,
	});
};
