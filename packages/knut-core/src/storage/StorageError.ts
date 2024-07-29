type BaseStorageError<Code extends string> = {
	code: Code;
	/**
	 * Message for end users
	 */
	message: string;
	/**
	 * detailed technical message
	 */
	reason?: string;
	error?: any;
	stackTrace?: string;
};

export interface DirExistsError extends BaseStorageError<'DIR_EXISTS'> {
	dirname: string;
}
export interface DirNotEmptyError extends BaseStorageError<'DIR_NOT_EMPTY'> {
	dirname: string;
}
export interface DirNotFoundError extends BaseStorageError<'DIR_NOT_FOUND'> {
	dirname: string;
}
export interface FileExistsError extends BaseStorageError<'FILE_EXISTS'> {
	filename: string;
}
export interface FileNotFoundError extends BaseStorageError<'FILE_NOT_FOUND'> {
	filename: string;
}
export interface NotADirectoryError
	extends BaseStorageError<'NOT_A_DIRECTORY'> {
	dirname: string;
}
export interface PathExistsError extends BaseStorageError<'PATH_EXISTS'> {
	path: string;
}
export interface PathNotFoundError extends BaseStorageError<'PATH_NOT_FOUND'> {
	path: string;
}
export interface PermissionError extends BaseStorageError<'PERMISSION_ERROR'> {}
export interface UknownError extends BaseStorageError<'UKNOWN_ERROR'> {}

export type StorageError =
	| DirExistsError
	| DirNotEmptyError
	| DirNotFoundError
	| FileExistsError
	| FileNotFoundError
	| NotADirectoryError
	| PathExistsError
	| PathNotFoundError
	| PermissionError
	| UknownError;

const makeError = <T extends StorageError>(options: T): T => {
	const { code, message, reason, error, stackTrace, ...opts } = options;
	let trace = options.stackTrace;
	if (trace === undefined && error instanceof Error) {
		trace = error.stack;
	}
	if (trace === undefined) {
		trace = new Error().stack;
	}
	return {
		code: options.code,
		message: options.message,
		reason: options.reason,
		error: options.error,
		stackTrace: options.stackTrace ?? new Error().stack,
		...opts,
	} as any;
};

export const permissionError = (options: {
	filename: string;
	message?: string;
	reason?: string;
	error?: any;
}): PermissionError => {
	return makeError({
		code: 'PERMISSION_ERROR',
		message:
			options.message ??
			`Permission error for file "${options.filename}"`,
		reason: options.reason,
		error: options.error,
	});
};

export const fileNotFound = (options: {
	filename: string;
	message?: string;
	reason?: string;
	error?: any;
}): FileNotFoundError =>
	makeError({
		code: 'FILE_NOT_FOUND',
		message: options.message ?? `File "${options.filename}" not found`,
		reason: options.reason,
		error: options.error,
		filename: options.filename,
	});

export const notADirectory = (options: {
	dirname: string;
	message?: string;
	reason?: string;
	error?: any;
}): NotADirectoryError => {
	return makeError({
		code: 'NOT_A_DIRECTORY',
		message: options.message ?? `Directory "${options.dirname}"`,
		reason: options.reason,
		error: options.error,
		dirname: options.dirname,
	});
};

export const dirNotEmpty = (options: {
	dirname: string;
	message?: string;
	reason?: string;
	error?: any;
}): DirNotEmptyError => {
	return makeError({
		code: 'DIR_NOT_EMPTY',
		dirname: options.dirname,
		message: `$Directory ${options.dirname} not empty`,
		reason: options.reason,
		error: options.error,
	});
};

export const dirNotFound = (options: {
	dirname: string;
	message?: string;
	reason?: string;
	error?: any;
}) =>
	makeError({
		code: 'DIR_NOT_FOUND',
		message: options.message ?? `Directory "${options.dirname}" not found`,
		reason: options.reason,
		error: options.error,
		dirname: options.dirname,
	});

export const uknownError = (options: {
	message?: string;
	reason?: string;
	error?: any;
}) =>
	makeError({
		code: 'UKNOWN_ERROR',
		message: options.message ?? 'Uknown Error',
		reason: options.reason,
		error: options.error,
	});

export const pathNotFound = (options: {
	path: string;
	message?: string;
	reason?: string;
	error?: any;
}) =>
	makeError({
		code: 'PATH_NOT_FOUND',
		message:
			options.message ?? `No such file or directory: ${options.path}`,
		reason: options.reason,
		error: options.error,
		path: options.path,
	});

export const pathExists = (options: {
	path: string;
	message?: string;
	reason?: string;
	error?: any;
}) =>
	makeError({
		code: 'PATH_EXISTS',
		path: options.path,
		message: options.message ?? `Path already exists: ${options.path}`,
		reason: options.reason,
		error: options.error,
	});

export const dirExists = (options: {
	dirname: string;
	message?: string;
	reason?: string;
	error?: any;
}) =>
	makeError({
		code: 'DIR_EXISTS',
		message: options.message ?? `Directory exists: ${options.dirname}`,
		dirname: options.dirname,
		reason: options.reason,
		error: options.error,
	});

export const fileExists = (options: {
	filename: string;
	message?: string;
	reason?: string;
	error?: any;
}) =>
	makeError({
		code: 'FILE_EXISTS',
		filename: options.filename,
		message: options.message ?? `File exists: ${options.filename}`,
		reason: options.error,
		error: options.error,
	});
