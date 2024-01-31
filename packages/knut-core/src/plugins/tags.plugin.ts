import * as YAML from 'yaml';
import { definePlugin } from './plugin.js';
import { stringify } from '../utils.js';
import { IndexPluginCreator } from './indexPlugin.js';

const tagIndex: IndexPluginCreator = async ({ keg }) => {
	return {
		name: 'tags',
		update: async () => {
			const options = keg.kegFile.getIndex('tags');
			if (!options) {
				return;
			}

			const filename = options?.file ?? `dex/tags.yaml`;
			const tags: Record<string, string[]> = {};
			for await (const [nodeId, node] of keg.getNodeList()) {
				for (const tag of node.getTags()) {
					tags[tag].push(stringify(nodeId));
				}
			}
			const content = YAML.stringify(tags);
			await keg.storage.write(filename, content);
		},
	};
};

export default definePlugin(async () => {
	return {
		name: 'tags',
		indexList: [tagIndex],
		searchList: [],
	};
});
