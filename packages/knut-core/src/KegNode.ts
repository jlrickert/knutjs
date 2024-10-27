import invariant from 'tiny-invariant';
import { NodeContent, NodeId, NodeMeta } from './Data/index.js';
import { KnutErrorScopeMap } from './Data/KnutError.js';
import { deepCopy, Future, Optional, Result } from './Utils/index.js';
import { Store } from './Store/index.js';

export type NodeOptions = {
	title: string;
	summary: string;
	meta?: NodeMeta.NodeMeta;
};

export type KegNodeOptions = {
	metaType: NodeMeta.NodeMetaType;
	contentType: NodeContent.NodeContentType;
};

export const DEFAULT_KEG_NODE_OPTIONS: KegNodeOptions = {
	contentType: NodeContent.DEFAULT_NODE_CONTENT_TYPE,
	metaType: NodeMeta.DEFAULT_NODE_META_TYPE,
};

/**
 * Node represents an in memory object containing all data
 * to be consisdered a keg node
 */
export class KegNode {
	/**
	 * test if at least has a content file
	 */
	static async hasContent(storage: Store.Store) {
		for (const t of NodeContent.NODE_CONTENT_TYPES) {
			const ok = await NodeContent.hasContentType({ type: t, storage });
			if (ok) {
				return ok;
			}
		}
		return false;
	}

	/**
	 * test if it has a meta file
	 */
	static async hasMeta(storage: Store.Store) {
		for (const t of NodeMeta.NODE_META_TYPES) {
			const ok = await NodeMeta.hasMetaType({ storage, type: t });
			if (ok) {
				return true;
			}
		}
		return false;
	}

	static async fromStorage(
		storage: Store.Store,
		options?: KegNodeOptions,
	): Future.FutureResult<
		KegNode,
		KnutErrorScopeMap['STORAGE' | 'MARKDOWN' | 'YAML' | 'JSON'][]
	> {
		const metaType = options?.metaType ?? NodeMeta.DEFAULT_NODE_META_TYPE;
		const contentType =
			options?.contentType ?? NodeContent.DEFAULT_NODE_CONTENT_TYPE;

		const errors: KnutErrorScopeMap[
			| 'STORAGE'
			| 'MARKDOWN'
			| 'YAML'
			| 'JSON'][] = [];
		const content = await NodeContent.fromStorage(storage, { contentType });
		const meta = await NodeMeta.fromStorage(storage, { metaType });
		if (Result.isErr(content)) {
			errors.push(content.error);
		}
		if (Result.isErr(meta)) {
			errors.push(meta.error);
		}
		if (errors.length > 0) {
			return Result.err(errors);
		}
		return Result.ok(
			new KegNode({
				storage,
				options: { contentType, metaType },
				content: Result.unwrap(content),
				meta: Result.unwrap(meta),
			}),
		);
	}

	static async create(params: {
		storage: Store.Store;
		meta?: NodeMeta.NodeMeta;
		title: string;
		summary: string;
		options?: Partial<KegNodeOptions>;
	}): Future.FutureResult<KegNode, KnutErrorScopeMap['STORAGE'][]> {
		const options: KegNodeOptions = {
			metaType:
				params.options?.metaType ?? NodeMeta.DEFAULT_NODE_META_TYPE,
			contentType:
				params.options?.contentType ??
				NodeContent.DEFAULT_NODE_CONTENT_TYPE,
		};
		const storage = params.storage;
		const content = NodeContent.fromContent({
			title: params.title,
			summary: params.summary,
			type: options.contentType,
		});
		const meta = params.meta ?? NodeMeta.make({});
		const node = new KegNode({ storage, options, meta, content });
		const result = await node.toStorage(params.storage);
		if (Result.isErr(result)) {
			return Result.err(result.error);
		}
		return Result.ok(node);
	}

	public readonly storage: Store.Store;
	public readonly options: KegNodeOptions;
	private content: NodeContent.NodeContent;
	private meta: NodeMeta.NodeMeta;
	private constructor(args: {
		readonly storage: Store.Store;
		readonly options: KegNodeOptions;
		content: NodeContent.NodeContent;
		meta: NodeMeta.NodeMeta;
	}) {
		this.storage = args.storage;
		this.options = args.options;
		this.content = args.content;
		this.meta = args.meta;
	}

	async toStorage(
		storage: Store.Store,
	): Future.FutureResult<true, KnutErrorScopeMap['STORAGE'][]> {
		const errors = [
			await NodeContent.toStorage({
				content: this.content,
				storage,
				contentType: this.options.contentType,
			}),
			await NodeMeta.toStorage({
				storage,
				meta: this.meta,
				metaType: this.options.metaType,
			}),
		].reduce(
			(errors, result) => {
				if (Result.isErr(result)) {
					errors.push(result.error);
				}
				return errors;
			},
			[] as KnutErrorScopeMap['STORAGE'][],
		);
		if (errors.length > 0) {
			return Result.err(errors);
		}
		return Result.ok(true);
	}

	/**
	 * Re pulls content and meta from the storage
	 */
	async refresh() {
		const content = await NodeContent.fromStorage(
			this.storage,
			this.options,
		);
		const meta = await NodeMeta.fromStorage(this.storage, this.options);
		const errors = [];
		if (Result.isErr(content)) {
			errors.push(content.error);
		}
		if (Result.isErr(meta)) {
			errors.push(meta.error);
		}
		if (errors.length > 0) {
			return Result.err(errors);
		}
		invariant(
			Result.isOk(content) && Result.isOk(meta),
			'Expect content and meta to be ok when there are no errors',
		);
		this.meta = meta.value;
		this.content = content.value;
	}

	getId() {
		return NodeId.parsePath(this.storage.uri);
	}

	setContent(
		f:
			| NodeContent.NodeContent
			| ((content: NodeContent.NodeContent) => void),
	) {
		if (typeof f === 'function') {
			f(this.content);
		} else {
			this.content = f;
		}
		this.meta.stats = this.meta.stats ?? {};
		this.meta.stats.updatedAt = new Date();
	}

	getUpdatedAt() {
		return this.meta.stats?.updatedAt ?? new Date();
	}

	setMeta(f: NodeMeta.NodeMeta | ((meta: NodeMeta.NodeMeta) => void)) {
		if (typeof f === 'function') {
			f(this.meta);
			this.meta = NodeMeta.make(this.meta);
		} else {
			this.meta = NodeMeta.make(this.meta);
		}
	}

	mergeMeta(meta: NodeMeta.NodeMeta) {
		this.meta = NodeMeta.merge(this.meta, meta);
	}

	getMeta() {
		return deepCopy(this.meta);
	}

	getContent() {
		return this.content.stringify();
	}

	setTitle(title: string) {
		this.setContent((c) => c.setTitle(title));
	}
	getTitle() {
		return this.content.getSummary();
	}

	setSummary(summary: string) {
		this.setContent((c) => c.setSummary(summary));
	}

	getTags() {
		if (Optional.isNone(this.meta.tags)) {
			return [];
		}
		return deepCopy(this.meta.tags);
	}

	addTags(tags: string[]) {
		this.mergeMeta({ tags });
	}

	removeTags(tags: string[]) {
		this.setMeta((m) => {
			if (Optional.isNone(m.tags)) {
				return;
			}
			for (const tag of tags) {
				const index = m.tags.indexOf(tag);
				if (index < 0) {
					continue;
				}
				delete m.tags[index];
			}
		});
	}
}
