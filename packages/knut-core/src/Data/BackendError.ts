import { KegUri } from './index.js';
import { BaseError } from '../Utils/index.js';
import { KnutConfigFile } from '../KnutConfigFile.js';

type BaseBackendError<Code extends string> = BaseError.BaseError<
	'BACKEND',
	Code
>;

export interface LoaderError extends BaseBackendError<'LOADER'> {
	uri: string;
	config: KnutConfigFile;
}

export interface InvalidURIError
	extends BaseError.BaseError<'BACKEND', 'INVALID_URI'> {
	uri: KegUri.KegUri;
}

export interface KegNotEnabled extends BaseBackendError<'KEG_NOT_ENABLED'> {
	alias: string;
}

export type BackendError = LoaderError | InvalidURIError | KegNotEnabled;

declare module './KnutError.js' {
	interface KnutErrorScopeMap {
		BACKEND: BackendError;
	}
}

export const invalidURI = (
	params: BaseError.BaseErrorParams<{ uri: KegUri.KegUri; message: string }>,
) => {
	return BaseError.make<InvalidURIError>({
		scope: 'BACKEND',
		code: 'INVALID_URI',
		...params,
	});
};

export const loaderError = (
	params: BaseError.BaseErrorParams<{ uri: string; config: KnutConfigFile }>,
) => {
	return BaseError.make<LoaderError>({
		scope: 'BACKEND',
		code: 'LOADER',
		message: `uri ${params.uri} not available`,
		...params,
	});
};

export const kegNotEnabled = (
	params: BaseError.BaseErrorParams<{ alias: string }>,
) => {
	return BaseError.make<KegNotEnabled>({
		scope: 'BACKEND',
		code: 'KEG_NOT_ENABLED',
		message: `Keg ${params.alias} not enabled`,
		...params,
	});
};
