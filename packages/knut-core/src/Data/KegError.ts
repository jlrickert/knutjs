import { KegUri } from './index.js';
import { BaseError } from '../Utils/index.js';

type BaseKegError<Code extends string> = BaseError.BaseError<'KEG', Code>;

export interface InvalidURIError
	extends BaseError.BaseError<'BACKEND', 'INVALID_URI'> {
	uri: KegUri.KegUri;
}

export interface KegAlreadyExistsError
	extends BaseKegError<'KEG_ALREADY_EXISTS'> {
	uri: string;
}

export interface KegDoesntExistsError extends BaseKegError<'KEG_DOESNT_EXIST'> {
	uri: string;
}

export interface KegAliasAlreadyExists
	extends BaseKegError<'KEGALIAS_ALREADY_EXISTS'> {
	alias: string;
}

export type KegError =
	| InvalidURIError
	| KegAliasAlreadyExists
	| KegAlreadyExistsError
	| KegDoesntExistsError;

declare module './KnutError.js' {
	interface KnutErrorScopeMap {
		KEG: KegError;
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

export const makeAliasExistsError = (
	params: BaseError.BaseErrorParams<{ alias: string }>,
) => {
	return BaseError.make<KegAliasAlreadyExists>({
		scope: 'KEG',
		code: 'KEGALIAS_ALREADY_EXISTS',
		message: params.message ?? `Keg alias "${params.alias}" already exists`,
		...params,
	});
};

export const makeKegExistsError = (
	params: BaseError.BaseErrorParams<{ uri: string }>,
) => {
	return BaseError.make<KegAlreadyExistsError>({
		scope: 'KEG',
		code: 'KEG_ALREADY_EXISTS',
		message: params.message ?? `Keg "${params.uri}" already exist`,
		...params,
	});
};

export const makeKegDoesntExistError = (
	params: BaseError.BaseErrorParams<{ uri: string }>,
) => {
	return BaseError.make<KegDoesntExistsError>({
		scope: 'KEG',
		code: 'KEG_DOESNT_EXIST',
		message: params.message ?? `Keg doesn't exist at "${params.uri}"`,
		...params,
	});
};
