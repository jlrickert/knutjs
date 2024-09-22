import { pipe } from 'fp-ts/lib/function.js';
import { Storage } from './Storage/index.js';
import { Dex } from './Dex.js';
import { Future, Optional, Result, FutureResult } from './Utils/index.js';
import { KegError, NodeContent, NodeId, NodeMeta } from './Data/index.js';
import { Backend } from './Backend/index.js';
import { KegConfig } from './KegConfig.js';
import {
	DEFAULT_KEG_NODE_OPTIONS,
	KegNode,
	KegNodeOptions,
} from './KegNode.js';
import { KnutConfigFile } from './KnutConfigFile.js';
import { KnutErrorScopeMap } from './Data/KnutError.js';

export type CreateNodeOptions = {
	content: string;
	tags?: string;
};

export type KegCreateParams = {
	storage: Storage.GenericStorage;
	/**
	 * auto loads backend if none provided.
	 */
	backend?: Backend.Backend;
	config?: KegConfig;
	kegalias?: string;
	/**
	 * By default append alias and storage conection options in the state
	 * config for knut.  This makes it append to the user config instead. alias
	 * is required for this to take affect.
	 */
	appendToUserConfig?: boolean;
	appendToStateConfig?: boolean;
	options?: KegNodeOptions;
};

export class Keg {
	static async hasKeg(storage: Storage.GenericStorage) {
		return KegConfig.hasConfig(storage);
	}

	static async hasKegAlias(kegalias: string, backend?: Backend.Backend) {
		const config = await KnutConfigFile.fromBackend(
			backend ?? (await Backend.detectBackend()),
		);
		return Optional.isSome(config.getKeg(kegalias));
	}

	static async fromAlias(params: {
		alias: string;
		backend?: Backend.Backend;
		options?: KegNodeOptions;
	}): Future.FutureResult<
		Keg,
		KnutErrorScopeMap['STORAGE' | 'JSON' | 'YAML' | 'KEG' | 'BACKEND']
	> {
		const backend = params.backend ?? (await Backend.detectBackend());
		return FutureResult.chain(backend.loader(params.alias), (storage) =>
			Keg.fromStorage({ storage, backend }),
		);
	}

	static async fromStorage(params: {
		storage: Storage.GenericStorage;
		backend?: Backend.Backend;
		options?: KegNodeOptions;
	}): Future.FutureResult<
		Keg,
		KnutErrorScopeMap['YAML' | 'JSON' | 'STORAGE' | 'KEG']
	> {
		const storage = params.storage;
		const backend = params.backend ?? (await Backend.detectBackend());
		if (!(await Keg.hasKeg(storage))) {
			return Result.err(
				KegError.makeKegExistsError({ uri: storage.uri }),
			);
		}
		const config = await KegConfig.fromStorage(storage);
		if (Result.isErr(config)) {
			return Result.err(config.error);
		}
		const dex = pipe(
			await Dex.fromStorage(storage),
			Result.getOrElse(() => new Dex()),
		);
		const keg = new Keg({
			config: config.value,
			dex,
			storage,
			backend,
			options: params.options ?? DEFAULT_KEG_NODE_OPTIONS,
		});
		return Result.ok(keg);
	}

	static async create(
		params: KegCreateParams,
	): Future.FutureResult<
		Keg,
		KnutErrorScopeMap['STORAGE' | 'YAML' | 'JSON' | 'KEG']
	> {
		const backend = params.backend ?? (await Backend.detectBackend());

		// Don't proceed if keg already exists
		if (await Keg.hasKeg(params.storage)) {
			return Result.err(
				KegError.makeKegExistsError({
					uri: params.storage.uri,
				}),
			);
		}

		const alias = params.kegalias;
		if (Optional.isSome(alias) && (await Keg.hasKegAlias(alias))) {
			return Result.err(
				KegError.makeAliasExistsError({
					alias,
					message: `Keg alias ${params.kegalias} already exists in config`,
				}),
			);
		}

		const storage = params.storage;
		const config = params.config ?? KegConfig.create({ url: storage.uri });
		const dex = new Dex();
		const keg = new Keg({
			config,
			dex,
			storage,
			backend,
			options: DEFAULT_KEG_NODE_OPTIONS,
		});

		// Create zero node
		await keg.createNode({
			title: NodeContent.TEMPLATES.zero.title,
			summary: NodeContent.TEMPLATES.zero.summary,
		});

		if (alias && params.appendToUserConfig) {
			await FutureResult.chain(
				KnutConfigFile.fromStorage(backend.config),
				(conf) => {
					conf.upsertKegConfig({
						alias,
						url: storage.uri,
						enabled: true,
						kegv: '2023-01',
					});
					return config.toStorage(backend.config);
				},
			);
		}
		if (alias && params.appendToStateConfig) {
			await FutureResult.chain(
				KnutConfigFile.fromStorage(backend.state),
				(conf) => {
					conf.upsertKegConfig({
						alias,
						url: storage.uri,
						enabled: true,
						kegv: '2023-01',
					});
					return config.toStorage(backend.state);
				},
			);
		}

		await keg.update();
		return Result.ok(keg);
	}

	public readonly config: KegConfig;
	public readonly dex: Dex;
	public readonly storage: Storage.GenericStorage;
	public readonly backend: Backend.Backend;
	public readonly options: KegNodeOptions;
	private constructor(params: {
		config: KegConfig;
		dex: Dex;
		storage: Storage.GenericStorage;
		backend: Backend.Backend;
		options: KegNodeOptions;
	}) {
		this.config = params.config;
		this.dex = params.dex;
		this.storage = params.storage;
		this.backend = params.backend;
		this.options = params.options;
	}

	async last(): Future.FutureResult<
		Optional.Optional<number>,
		KnutErrorScopeMap['STORAGE']
	> {
		const nodeList = await Storage.listNodes(this.storage);
		if (Result.isErr(nodeList)) {
			return Result.err(nodeList.error);
		}
		nodeList.value.sort((a, b) => a - b);
		return nodeList.value.length > 0
			? Result.ok(Optional.some(nodeList.value[0]))
			: Result.ok(Optional.none);
	}

	async createNode(options?: {
		title?: string;
		summary?: string;
		meta?: NodeMeta.NodeMeta;
	}): Future.FutureResult<KegNode, KnutErrorScopeMap['STORAGE'][]> {
		const nextId = pipe(
			await this.last(),
			Result.map((lastId) => (Optional.isSome(lastId) ? lastId + 1 : 0)),
		);
		if (Result.isErr(nextId)) {
			return Result.err([nextId.error]);
		}
		const nodeId = nextId.value;
		const node = pipe(
			KegNode.create({
				title: options?.title ?? '',
				summary: options?.summary ?? '',
				storage: this.storage.child(nodeId),
			}),
			FutureResult.chain(async (node) => {
				this.dex.addNode(nodeId, node);
				await this.dex.toStorage(this.storage);
				this.config.data.updated = new Date();
				await this.config.toStorage(this.storage);
				return Result.ok(node);
			}),
		);
		return node;
	}

	async getNode(nodeId: NodeId.NodeId) {
		const storage = this.storage.child(nodeId);
		const node = await KegNode.fromStorage(storage, this.options);
		return node;
	}

	async deleteNode(
		nodeId: NodeId.NodeId,
	): Future.FutureResult<true, KnutErrorScopeMap['STORAGE'][]> {
		const errors: KnutErrorScopeMap['STORAGE'][] = [];
		Result.tapError(await this.storage.rm(nodeId), (error) =>
			errors.push(error),
		);
		Result.tapError(await this.dex.toStorage(this.storage), (error) =>
			errors.push(error),
		);
		return errors.length > 0 ? Result.err(errors) : Result.ok(true);
	}

	async getNodeList(): Future.FutureResult<
		NodeId.NodeId[],
		KnutErrorScopeMap['STORAGE']
	> {
		return Storage.listNodes(this.storage);
	}

	async update(): Future.FutureOptional<KnutErrorScopeMap['STORAGE']> {
		const nodeIdList = await this.getNodeList();
		if (Result.isErr(nodeIdList)) {
			return Optional.some(nodeIdList.error);
		}
		this.dex.clear();
		for (const nodeId of nodeIdList.value) {
			const node = await this.getNode(nodeId);
			if (Result.isOk(node)) {
				this.dex.addNode(nodeId, node.value);
			}
		}
		await this.dex.toStorage(this.storage);
		this.config.data.updated = new Date();
		this.config.toStorage(this.storage);
	}
}
