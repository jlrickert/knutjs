import { BackendError } from './Backend/index.js';
import { StorageError } from './Storage/index.js';
import { JsonError, YamlError } from './Utils/index.js';

export interface BaseError<Scope extends string> {
	scope: Scope;
	code: string;
	message: string;
	reason?: string;
}

export type KnutError =
	| StorageError.StorageError
	| YamlError.YamlError
	| JsonError.JsonError
	| BackendError.BackendError;
