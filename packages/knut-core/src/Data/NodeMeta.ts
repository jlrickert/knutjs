import {
	deepCopy,
	Future,
	Optional,
	parseDate,
	Result,
} from '../Utils/index.js';
import { Storage } from '../Storage/index.js';
import { KnutErrorScopeMap } from './KnutError.js';
import { Json, NodeMeta, Yaml } from './index.js';
import invariant from 'tiny-invariant';
import { NonEmptyReadonlyArray } from 'effect/Array';

export type NodeMeta = Json.Json & {
	tags?: string[];
	date?: Date;
	stats?: {
		createdAt?: Date;
		updatedAt?: Date;
		lastAccessed?: Date;
		accessedCount?: number;
	};
};

export type NodeMetaType = 'yaml' | 'json';
export type NodeMetaStats = {
	createdAt: Date;
	updatedAt: Date;
	lastAccessed: Date;
	accessedCount: number;
};
export const DEFAULT_NODE_META_TYPE = 'yaml';
export const META_FILEMAP = {
	json: 'meta.json',
	yaml: 'meta.yaml',
} as const;
export const NODE_META_TYPES = ['yaml', 'json'] as const;

export const make = (meta: NodeMeta): NodeMeta => {
	if (typeof meta.date === 'string') {
		meta.date = parseDate(meta.date);
	}
	if (typeof meta.stats?.createdAt === 'string') {
		meta.stats.createdAt = parseDate(meta.stats.createdAt);
	}
	if (typeof meta.stats?.updatedAt === 'string') {
		meta.stats.updatedAt = parseDate(meta.stats.updatedAt);
	}
	if (typeof meta.stats?.lastAccessed === 'string') {
		meta.stats.lastAccessed = parseDate(meta.stats.lastAccessed);
	}
	if (Array.isArray(meta.tags)) {
		meta.tags = meta.tags.reduce((acc, tag) => {
			if (!acc.includes(tag)) {
				acc.push(tag);
			}
			return acc;
		}, [] as string[]);
	}
	return meta;
};

export const filePath = (options?: { type?: NodeMetaType }) => {
	const t = options?.type ?? DEFAULT_NODE_META_TYPE;
	return META_FILEMAP[t];
};

export const hasMetaType = async (options: {
	type: NodeMetaType;
	storage: Storage.GenericStorage;
}) => {
	const { type, storage } = options;
	return Result.isOk(await storage.stats(filePath({ type })));
};

/**
 * Maps the content type the appropriate functions.  The returned type is wrong
 * as the Json and Yaml don't now how to handle dates. They are actually
 * strings. Make sure to fix
 */
const META_PARSER_MAP: Record<
	NodeMetaType,
	(
		data: string,
	) => Result.Result<NodeMeta, KnutErrorScopeMap['JSON' | 'YAML']>
> = {
	yaml: (data) =>
		Result.map(Yaml.parse<NodeMeta>(data), (meta) => make(meta)),
	json: (data) =>
		Result.map(Json.parse<NodeMeta>(data), (meta) => make(meta)),
};

/**
 * Working directory for storage should be that of the node. For example
 * `/some/path/kegs/kegalias/234`.
 */
export const fromStorage = async (
	storage: Storage.GenericStorage,
	options?: {
		metaType?: NodeMetaType;
	},
): Future.FutureResult<
	NodeMeta,
	KnutErrorScopeMap['STORAGE' | 'JSON' | 'YAML']
> => {
	const metaType = options?.metaType ?? DEFAULT_NODE_META_TYPE;
	const path = filePath({ type: metaType });
	return Result.chain(await storage.read(path), (data) =>
		META_PARSER_MAP[metaType](data),
	);
};

const META_STRINGER_MAP: Record<NodeMetaType, (meta: NodeMeta) => string> = {
	yaml: (meta) => Yaml.stringify(meta),
	json: (meta) => Json.stringify(meta),
};
export const stringify = (
	meta: NodeMeta,
	options?: { type?: NodeMetaType },
) => {
	return META_STRINGER_MAP[options?.type ?? DEFAULT_NODE_META_TYPE](meta);
};

export const toStorage = async (options: {
	storage: Storage.GenericStorage;
	meta: NodeMeta;
	metaType?: NodeMetaType;
}) => {
	const { storage, meta, metaType: t = DEFAULT_NODE_META_TYPE } = options;
	const path = filePath({ type: t });
	const content = stringify(meta, { type: t });
	return storage.write(path, content);
};

export const emptyMeta = (): NodeMeta => ({});

const statsLens = <K extends keyof NodeMetaStats>(
	root: NodeMeta,
	key: K,
	value: NodeMetaStats[K],
): NodeMeta => {
	const next = deepCopy(root);
	next.stats = next.stats ?? {};
	invariant(Optional.isSome(next.stats));
	next.stats[key] = value;
	return next;
};

export const merge = (...metas: NonEmptyReadonlyArray<NodeMeta>) => {
	const root = emptyMeta();
	for (const other of metas) {
		root.tags = Optional.isSome(other.tags)
			? [...(root.tags ?? []), ...other.tags]
			: root.tags;
		root.date = Optional.isSome(other.date) ? other.date : root.date;

		const statLens = <K extends keyof NodeMetaStats>(k: K) => {
			const stats = other.stats;
			if (Optional.isNone(stats)) {
				return;
			}
			root.stats = root.stats ?? {};
			root.stats[k] = stats[k];
		};

		statLens('accessedCount');
		statLens('lastAccessed');
		statLens('updatedAt');
		statLens('createdAt');
	}
	return make(root);
};
