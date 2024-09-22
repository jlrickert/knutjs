import { Optional, pipe } from './index.js';

export interface BaseError<Scope extends string, Code extends string> {
	scope: Scope;
	code: Code;
	/*
	 * Brief desciption of the error. Intent is for displaying to end users.
	 */
	message: string;

	/**
	 * Additionial data related to the error
	 */
	data?: any;
	reason?: string;
	error?: any;
	stackTrace?: string;
}

export type BaseErrorArgs<T = {}> = T & {
	/*
	 * Brief desciption of the error. Intent is for displaying to end users.
	 */
	message: string;

	/**
	 * Additionial data related to the error
	 */
	data?: any;

	/**
	 * Detailed explanation of the error
	 */

	reason?: string;

	/**
	 * Error thrown if any
	 */
	error?: any;

	/*
	 * Stack trace
	 */
	stackTrace?: string;
};

/**
 * Create an error. T parameter is for type hints only.
 */
export const make = <T extends BaseError<any, any>>(options: T): T => {
	const { scope, code, message, reason, error, stackTrace, ...opts } =
		options;
	const trace = pipe(
		Optional.fromNullable(stackTrace),
		Optional.alt(() => {
			try {
				return Optional.some(error.stack());
			} catch (e) {
				return Optional.none;
			}
		}),
		Optional.alt(() => new Error().stack),
	);

	return {
		scope: options.scope,
		code: options.code,
		message: options.message,
		reason: options.reason,
		error: options.error,
		stackTrace: trace,
		...opts,
	} as any;
};
