import { BaseError } from '../Utils/index.js';

export interface LoaderError extends BaseError.BaseError<'BACKEND', 'LOADER'> {
	kegAlias: string;
}

export type BackendError = LoaderError;

export const loaderError = (
	options: BaseError.BaseErrorArgs<{ kegAlias: string }>,
) => {
	return BaseError.make<LoaderError>({
		scope: 'BACKEND',
		code: 'LOADER',
		...options,
	});
};
