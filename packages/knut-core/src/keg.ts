import { Dex } from './dex.js';
import { EnvStorage } from './envStorage.js';
import { KegFile } from './kegFile.js';
import { KegStorage, loadKegStorage } from './kegStorage.js';
import { KegNode, NodeId } from './node.js';
import { IndexPlugin, IndexPluginCreator } from './plugins/indexPlugin.js';
import { KnutPlugin } from './plugins/plugin.js';
import {
	SearchOptions,
	SearchPlugin,
	SearchPluginCreator,
	SearchResult,
} from './plugins/searchPlugin.js';

export type CreateNodeOptions = {
	content: string;
	tags?: string;
};

export class Keg {
	static async fromStorage(
		storage: string | KegStorage,
		env: EnvStorage,
		options?: {
			indexList: IndexPluginCreator[];
			searchList: SearchPluginCreator[];
		},
	): Promise<Keg | null> {
		const store =
			typeof storage === 'string' ? loadKegStorage(storage) : storage;
		const kegFile = await KegFile.fromStorage(store);
		const dex = await Dex.fromStorage(store);
		if (!kegFile || !dex) {
			return null;
		}
		const keg = new Keg(kegFile, dex, store);
		for (const creator of options?.searchList ?? []) {
			keg.addSearch(creator);
		}
		for (const creator of options?.indexList ?? []) {
			await keg.addIndex(creator);
		}
		return keg;
	}

	private indexPlugins: IndexPlugin[] = [];
	private searchPlugins = new Map<string, SearchPlugin>();
	private constructor(
		public readonly kegFile: KegFile,
		public readonly dex: Dex,
		public readonly storage: KegStorage,
	) {}

	// async createNode({
	// 	content,
	// 	tags,
	// }: CreateNodeOptions): Promise<KegNodeRef> {
	// 	const nodeList = await this.storage.listNodes();
	// 	nodeList.sort((a, b) => (a.lt(b) ? 1 : -1));
	// 	const nodeId = nodeList.length > 0 ? nodeList[0] : new NodeId('0');
	// 	const node = await KegNode.fromContent({ content });
	// 	if (tags) {
	// 		for (const tag of tags) {
	// 			node.addTag(tag);
	// 		}
	// 	}
	// 	this.storage.write('' node.content)
	// 	this.dex.addNode(node.nodeId, await node.node);
	// 	this.dex.addNode;
	// 	this.storage.listNodes;
	// }

	async last(): Promise<NodeId | null> {
		const nodeList = await this.storage.listNodes();
		nodeList.sort((a, b) => (a.lt(b) ? 1 : -1));
		const nodeId = nodeList.length > 0 ? nodeList[0] : null;
		return nodeId;
	}

	async getNode(nodeId: NodeId): Promise<KegNode | null> {
		const node = await KegNode.fromStorage(nodeId, this.storage);
		return node;
	}

	async search(
		model: string,
		options: SearchOptions,
	): Promise<SearchResult[]> {
		const plugin = this.searchPlugins.get(model) ?? null;
		if (!plugin) {
			return [];
		}
		const results = await plugin.search(options);
		return results;
	}

	async *getNodeList(): AsyncGenerator<
		readonly [NodeId, KegNode],
		void,
		unknown
	> {
		for (const entry of this.dex.entries) {
			const node = await this.getNode(entry.nodeId);
			if (node) {
				yield [entry.nodeId, node] as const;
			}
		}
	}

	async update(): Promise<void> {
		for (const plugin of this.indexPlugins) {
			if (plugin.update) {
				await plugin.update();
			}
		}
	}

	// async import(nodes: KegNodeRef[]): Promise<Keg> {
	// 	throw new Error('not implemented');
	// }
	// async addIndex(creator: IndexPluginCreator) {
	// 	const plugin = await creator({ keg: this });
	// 	const index = this.indexPlugins.findIndex(
	// 		(p) => p.name === plugin.name,
	// 	);
	// 	this.indexPlugins[index < 0 ? this.indexPlugins.length : index] =
	// 		plugin;
	// }
	//
	// async addSearch(creator: SearchPluginCreator) {
	// 	const plugin = await creator({ keg: this });
	// 	this.searchPlugins.set(plugin.name, plugin);
	// }

	async addPlugin(plugin: KnutPlugin) {
		for (const creator of plugin.indexList) {
			const plug = await creator({ keg: this });
			plug.name;
		}
	}
}
