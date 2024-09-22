import { Optional } from '../Utils/index.js';

export type NodeId = number;
export const stringify = (nodeId: NodeId) => `${nodeId}`;

export const lt = (a: NodeId, b: NodeId) => a < b;
export const lte = (a: NodeId, b: NodeId) => a <= b;
export const gt = (a: NodeId, b: NodeId) => a > b;
export const gte = (a: NodeId, b: NodeId) => a >= b;
export const eq = (a: NodeId, b: NodeId) => a === b;
export const ne = (a: NodeId, b: NodeId) => a !== b;

export const parsePath = (
	path: string,
	sep = '/',
): Optional.Optional<number> => {
	const parts = path.split(sep);
	for (const part of parts) {
		if (/^\d+$/.test(part)) {
			return Number.parseInt(part);
		}
	}
	return Optional.none;
};
