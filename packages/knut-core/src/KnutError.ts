import { BackendError } from './Backend/index.js';
import { StorageError } from './Storage/index.js';
import { BaseError, JsonError, YamlError } from './Utils/index.js';

export interface BaseCoreError<Code extends string>
	extends BaseError.BaseError<'CORE', Code> { }

export interface UnknownError extends BaseCoreError<'UNKNOWN'> { }

export type KnutError =
	| UnknownError
	| StorageError.StorageError
	| YamlError.YamlError
	| JsonError.JsonError
	| BackendError.BackendError;
