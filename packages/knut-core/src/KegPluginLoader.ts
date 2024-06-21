import { KegPlugin } from './KegPlugin/KegPlugin.js';
import { Future, Optional } from './internal/index.js';
import { Keg } from './keg.js';
import { NodeId } from './KegNode.js';
import { fromRecord } from 'effect/Iterable';

export type PluginRecord = Record<string, KegPlugin<any>>;

/**
 * Loads all plugins
 */
export class KegPluginLoader {
	private _keg: Keg | null = null;
	private plugins: Map<string, KegPlugin<any>> = new Map();

	static fromRecord(record: PluginRecord): KegPluginLoader {
		const loader = new KegPluginLoader();
		for (const [name, plugin] of fromRecord(record)) {
			loader.addPlugin(name, plugin);
		}
		return loader;
	}

	constructor() { }

	*[Symbol.iterator]() {
		for (const plugin of this.plugins) {
			yield plugin;
		}
	}

	private keg() {
		if (this._keg === null) {
			throw new Error('keg needs to be initialized');
		}
		return this._keg;
	}

	getPlugin<Services extends Partial<Keg>>(
		name: string,
	): Optional.Optional<KegPlugin<Services>> {
		return this.plugins.get(name) ?? null;
	}

	addPlugin(name: string, plugin: KegPlugin<any>) {
		this.plugins.set(name, plugin);
	}

	async newKeg(keg: Keg, createKeg: () => Future.Future<void>) {
		const next = [...this.plugins.values()]
			.reverse()
			.reduce((next, plugin) => {
				return async () =>
					plugin.newKeg(keg, async () => {
						next();
					});
			}, createKeg);
		await next();
	}

	async init(keg: Keg, fn: () => Future.Future<void>) {
		this._keg = keg;
		const next = [...this.plugins.values()]
			.reverse()
			.reduce((next, plugin) => {
				return async () =>
					plugin.init(keg, async () => {
						next();
					});
			}, fn);
		await next();
	}

	async reloadConfig(next: () => Future.Future<void>) {
		for (const [, plugin] of this.plugins) {
			await plugin.reloadConfig(this.keg, next);
		}
	}

	async createNode(nodeId: NodeId, next: () => Future.Future<void>) {
		for (const [, plugin] of this.plugins) {
			await plugin.createNode(nodeId, this.keg, next);
		}
	}

	async readNode(nodeId: NodeId, next: () => Future.Future<void>) {
		for (const [, plugin] of this.plugins) {
			await plugin.readNode(nodeId, this.keg, next);
		}
	}

	async writeNode(nodeId: NodeId, next: () => Future.Future<void>) {
		for (const [, plugin] of this.plugins) {
			await plugin.writeNode(nodeId, this.keg, next);
		}
	}

	async deleteNode(nodeId: NodeId, next: () => Future.Future<void>) {
		for (const [, plugin] of this.plugins) {
			await plugin.deleteNode(nodeId, this.keg(), next);
		}
	}
}
