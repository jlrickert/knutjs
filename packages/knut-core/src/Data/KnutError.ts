import { BaseError } from '../Utils/index.js';

export interface BaseCoreError<Code extends string>
	extends BaseError.BaseError<'CORE', Code> {}

export interface UnknownError extends BaseCoreError<'UNKNOWN'> {}
export type CoreError = UnknownError;

export interface KnutErrorScopeMap {
	CORE: UnknownError;
}

export type KnutErrorScope = keyof KnutErrorScopeMap;
export type KnutError = KnutErrorScopeMap[keyof KnutErrorScopeMap];

export const makeUnknownError = (args: BaseError.BaseErrorArgs<{}>) => {
	return BaseError.make<UnknownError>({
		scope: 'CORE',
		code: 'UNKNOWN',
		...args,
	});
};
