import { BaseError } from '../Utils/index.js';

export interface LoaderError extends BaseError.BaseError<'BACKEND', 'LOADER'> {
	kegAlias: string;
}

export type BackendError = LoaderError;

declare module '../Data/KnutError.js' {
	interface KnutErrorScopeMap {
		BACKEND: BackendError;
	}
}

export const loaderError = (
	options: BaseError.BaseErrorParams<{ kegAlias: string; message: string }>,
) => {
	return BaseError.make<LoaderError>({
		scope: 'BACKEND',
		code: 'LOADER',
		...options,
	});
};
