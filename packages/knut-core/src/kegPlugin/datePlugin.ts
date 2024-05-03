import { array, option } from 'fp-ts';
import { pipe } from 'fp-ts/lib/function.js';
import { optional } from '../internal/optional.js';
import { NodeId } from '../node.js';
import { KegConfig, KegConfigData } from '../kegConfig.js';
import { KegPluginShape, createKegPlugin } from './kegPlugin.js';
import { Future } from '../internal/future.js';
import { Keg } from '../keg.js';

export type DateDexEntry = {
	nodeId: NodeId;
	date: Date;
	title: string;
};

class DatePluginImpl implements KegPluginShape {
	name: string = 'date';
	onInit?: (keg: Keg) => Future<void>;
	onUpdate?: (keg: Keg) => Future<void>;
	onNodeCreate?: (nodeId: NodeId) => Future<void>;
	onNodeWrite?: (nodeId: NodeId) => Future<void>;
	onNodeDelete?: (nodeId: NodeId) => Future<void>;
	onConfigReload?: (config: KegConfig) => Future<void>;
}

// export const DateKegPlugin = createKegPlugin('date', async (keg) => {
// 	const buildData = (config: KegConfigData) => {
// 		return pipe(
// 			config.indexes?.filter((a) => a.name === 'date') ?? [],
// 			array.filterMap((a) => {
// 				return pipe(
// 					a.args,
// 					optional.refine(function (a): a is { tags: string[] } {
// 						if (typeof a === 'object' && !('tags' in a)) {
// 							return false;
// 						}
// 						return true;
// 					}),
// 					optional.bind('file', () => a.file),
// 					optional.bind('list', () => [] as DateDexEntry[]),
// 					option.fromNullable,
// 				);
// 			}),
// 		);
// 	};
//
// 	let data = buildData(keg.config.data);
//
// 	const addNode = async (nodeId: NodeId) => {
// 		for (const config of data) {
// 			const entry = pipe(
// 				await keg.getNode(nodeId),
// 				optional.bindTo('node'),
// 				optional.bind('date', ({ node }) =>
// 					pipe(
// 						node.meta.get('date'),
// 						optional.refine(function (a): a is string {
// 							return typeof a === 'string';
// 						}),
// 						optional.map((a) => new Date(a)),
// 					),
// 				),
// 				optional.filter(({ node }) => {
// 					if (config.tags.length === 0) {
// 						return true;
// 					}
// 					const tags = node.meta.getTags();
// 					return config.tags.reduce(
// 						(acc, tag) => acc && tags.includes(tag),
// 						true,
// 					);
// 				}),
// 				optional.map(
// 					({ node, date }): DateDexEntry => ({
// 						nodeId,
// 						date,
// 						title: node.title,
// 					}),
// 				),
// 			);
// 			if (optional.isNone(entry)) {
// 				const index = config.list.findIndex((a) =>
// 					a.nodeId.neq(nodeId),
// 				);
// 				if (index < 0) {
// 					continue;
// 				}
// 				delete config.list[index];
// 				continue;
// 			}
//
// 			const index = config.list.findIndex((a) =>
// 				a.nodeId.eq(entry.nodeId),
// 			);
// 			if (index < 0) {
// 				config.list.push(entry);
// 				continue;
// 			}
// 			config.list[index] = entry;
// 			continue;
// 		}
// 	};
//
// 	const update = async () => {
// 		for (const config of data) {
// 			config.list = [];
// 			for (const { nodeId } of keg.dex.entries) {
// 				await addNode(nodeId);
// 			}
// 		}
// 	};
//
// 	return {
// 		update: async () => update(),
// 		createNode: async ({ nodeId }) => addNode(nodeId),
// 		readNode: async ({ nodeId }) => addNode(nodeId),
// 		updateNode: async ({ nodeId }) => addNode(nodeId),
// 		removeNode: async ({ nodeId }) => addNode(nodeId),
// 		reloadConfig: async ({ config }) => {
// 			data = buildData(config);
// 		},
// 	};
// });
