import { NodeId } from '../../KegNode.js';
import { Future, Optional } from '../../internal/index.js';
import { KegStorage } from '../../kegStorage.js';
import { Keg } from '../../keg.js';
import { KegPlugin } from '../KegPlugin.js';
import { DateDex } from './DateDex.js';
import { KegConfig } from '../../KegConfig.js';

// export const DateKegPlugin = () => {
// 	return new KegPlugin({
// 		onInit: async (ctx, next) => {},
// 		onConfigReload: async (ctx) => {},
// 	});
// };

export default {};
// () => {
// 	const dexList: DateDex[] = [];
//
// 	return new KegPlugin<{ config: Keg['config']; dex: Keg['dex'] }>({
// 		onInit: (ctx) => {},
// 		onConfigReload: (context) => {},
// 	});
// };

// export class DateKegPlugin extends KegPlugin<Pick<Keg, 'config' | 'dex'>> {
// 	public readonly dexList: DateDex[] = [];
//
// 	protected async onInit(
// 		services: Pick<Keg, 'config' | 'dex'>,
// 	): Future.Future<void> {
// 		services.
// 		this.initConfig();
// 	}
//
// 	protected async onNodeCreate(nodeId: NodeId): Future.Future<void> {
// 		const entry = this.services.dex.getEntry(nodeId);
// 		if (Optional.isNone(entry)) {
// 			return;
// 		}
// 		for (const index of this.dexList) {
// 			index.addEntry(entry);
// 		}
// 	}
//
// 	protected async onNodeWrite(nodeId: NodeId): Future.Future<void> {
// 		const entry = this.services.dex.getEntry(nodeId);
// 		if (Optional.isNone(entry)) {
// 			return;
// 		}
// 		for (const index of this.dexList) {
// 			index.updateEntry(entry);
// 		}
// 	}
//
// 	protected async onNodeDelete(nodeId: NodeId): Future.Future<void> {
// 		for (const entry of this.dexList) {
// 			entry.removeNode(nodeId);
// 		}
// 	}
//
// 	protected async onUpdate(): Future.Future<void> {
// 		for (const entry of this.dexList) {
// 			entry.rebuildFromDex(this.services.dex);
// 		}
// 	}
//
// 	protected async onConfigReload(): Future.Future<void> {
// 		this.initConfig();
// 	}
//
// 	async toStorage(storage: KegStorage): Future.Future<void> {
// 		for (const dex of this.dexList) {
// 			await dex.toStorage(storage);
// 		}
// 	}
//
// 	/**
// 	 * clears and initializes all the indexes in memory.
// 	 */
// 	private initConfig() {
// 		this.clearDexList();
// 		const kegConfig = this.services.config.lookupPluginData('date');
// 		if (!kegConfig.isEnabled) {
// 			return;
// 		}
//
// 		for (const rawConfig of kegConfig.indexList) {
// 			const dex = DateDex.parse(rawConfig);
// 			this.dexList.push(dex);
// 			dex.rebuildFromDex(this.services.dex);
// 		}
// 	}
//
// 	private clearDexList() {
// 		for (let i = 0; i < this.dexList.length; i++) {
// 			delete this.dexList[i];
// 		}
// 	}
// }
