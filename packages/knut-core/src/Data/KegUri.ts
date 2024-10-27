import { BaseError, Optional, Result } from '../Utils/index.js';
import { NodeId } from './index.js';

type KegProtocol = 'keg+ssh' | 'keg+https' | 'keg+http' | 'keg';
export type KegUri = {
	protocol: KegProtocol;
	kegalias: string;
	nodeId: Optional.Optional<NodeId.NodeId>;
	authority?: {
		username?: string;
		password?: string;
	};
	query: { search?: string };
};

export type UriParseError = BaseError.BaseError<'KEG', 'PARSE_ERROR'>;

export const parse = (uri: string): Result.Result<KegUri, UriParseError> => {
	const id = NodeId.parsePath(uri);
	const u = new URL(uri);
	return Result.ok({
		protocol: 'keg',
		kegalias: uri,
		nodeId: id,
		query: {},
	});
};

export const stringify = (uri: KegUri) => {
	return `${uri.protocol}:${uri.kegalias}/${uri.nodeId}`;
};
