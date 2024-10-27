import { Store } from '../Store/index.js';
import { absurd, Future, Optional, Result } from '../Utils/index.js';
import { KegNodeAST, KegNodeASTOutput } from '../Utils/KegNodeAST.js';
import { KnutError, NodeId } from './index.js';

export type NodeContent = KegNodeAST;
export type NodeBaseContent = {
	title: string;
	summary: string;
};
export type NodeContentType = KegNodeASTOutput;

export const DEFAULT_NODE_CONTENT_TYPE = 'markdown';
const CONTENT_FILEMAP = {
	markdown: 'README.md',
} as const;
export const NODE_CONTENT_TYPES = ['markdown'] as const;

export function customFilePath(
	nodeId: NodeId.NodeId,
	name: string,
	ext?: string,
) {
	if (Optional.isSome(ext)) {
		return `${nodeId}/${name}.${ext}`;
	}
	return `${nodeId}/${name}`;
}

export function contentFilename(options?: { type?: NodeContentType }) {
	const t = options?.type ?? DEFAULT_NODE_CONTENT_TYPE;
	return CONTENT_FILEMAP[t];
}

export function fromContent(params: {
	title: string;
	summary?: string;
	type?: NodeContentType;
}) {
	const ast = KegNodeAST.make();
	ast.setTitle(params.title);
	if (params.summary) {
		ast.setSummary(params.summary);
	}
	return ast;
}

export async function hasContentType(options: {
	type: NodeContentType;
	storage: Store.Store;
}) {
	const { type, storage } = options;
	return Result.isOk(await storage.stats(contentFilename({ type })));
}

/**
 * Working directory for storage should be that of the node. For example
 * `/some/path/kegs/kegalias/234`.
 */
export async function fromStorage(
	storage: Store.Store,
	options?: {
		contentType?: NodeContentType;
	},
): Future.FutureResult<
	NodeContent,
	KnutError.KnutErrorScopeMap['STORAGE' | 'MARKDOWN']
> {
	const contentType = options?.contentType ?? DEFAULT_NODE_CONTENT_TYPE;
	const path = contentFilename({ type: contentType });
	const content = Result.chain(await storage.read(path), (data) => {
		switch (contentType) {
			case 'markdown': {
				return KegNodeAST.parseMarkdown(data);
			}

			default: {
				return absurd<never>(contentType);
			}
		}
	});
	return content;
}

export async function toStorage(options: {
	storage: Store.Store;
	content: NodeContent;
	contentType?: NodeContentType;
}) {
	const contentType = options?.contentType ?? DEFAULT_NODE_CONTENT_TYPE;
	switch (contentType) {
		case 'markdown': {
			return options.storage.write(
				contentFilename({ type: 'markdown' }),
				toMarkdown(options.content),
			);
		}
		default: {
			return absurd<never>(contentType);
		}
	}
}

export function toMarkdown(ast: NodeContent) {
	return ast.stringify();
}

const CONTENT_STRINGER_MAP: Record<
	NodeContentType,
	(content: NodeContent) => string
> = {
	markdown: toMarkdown,
};

export function stringify(
	content: NodeContent,
	options?: { type?: NodeContentType },
) {
	return CONTENT_STRINGER_MAP[options?.type ?? DEFAULT_NODE_CONTENT_TYPE](
		content,
	);
}

export function make(node: NodeBaseContent): NodeBaseContent {
	return {
		title: node.title,
		summary: node.summary,
	};
}

export const TEMPLATES = {
	zero: make({
		title: 'Sorry, planned but not yet available',
		summary:
			'This is a filler until I can provide someone better for the link that brought you here. If you are really anxious, consider opening an issue describing why you would like this missing content created before the rest.',
	}),
} as const;
