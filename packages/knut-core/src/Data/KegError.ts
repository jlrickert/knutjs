import { BaseError } from '../Utils/index.js';

type BaseKegError<Code extends string> = BaseError.BaseError<'KEG', Code>;
export type KegAlreadyExistsError = BaseKegError<'KEG_ALREADY_EXISTS'>;
export type KegAliasAlreadyExists = BaseKegError<'ALIAS_ALREADY_EXISTS'>;

export type KegError = KegAlreadyExistsError | KegAliasAlreadyExists;

declare module './KnutError.js' {
	interface KnutErrorScopeMap {
		KEG: KegError;
	}
}

export const makeKegExistsError = (
	params: BaseError.BaseErrorParams<{ uri: string }>,
) => {
	return BaseError.make<KegAlreadyExistsError>({
		scope: 'KEG',
		code: 'KEG_ALREADY_EXISTS',
		message: params?.message ?? `Keg already exists at "${params.uri}"`,
		...params,
	});
};

export const makeAliasExistsError = (
	params: BaseError.BaseErrorParams<{ alias: string }>,
) => {
	return BaseError.make<KegAliasAlreadyExists>({
		scope: 'KEG',
		code: 'ALIAS_ALREADY_EXISTS',
		message: params.message ?? `Keg alias "${params.alias}" already exists`,
		...params,
	});
};
