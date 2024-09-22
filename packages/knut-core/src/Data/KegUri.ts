import { BaseError, Optional, Result } from '../Utils/index.js';
import { NodeId } from './index.js';

type KegProtocol = 'ssh' | 'https' | 'http' | 'keg';
export type KegUri = {
	protocol: KegProtocol;
	alias: string;
	nodeId: Optional.Optional<NodeId.NodeId>;
};

export type UriParseError = BaseError.BaseError<'KEG', 'PARSE_ERROR'>;

export const parse = (uri: string): Result.Result<KegUri, UriParseError> => {
	const id = NodeId.parsePath(uri);
	return Result.ok({
		protocol: 'keg',
		alias: uri,
		nodeId: id,
	});
};
