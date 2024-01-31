import invariant from 'tiny-invariant';
import { Dex, DexEntry } from '../dex.js';
import { NodeId } from '../node.js';
import { definePlugin } from './plugin.js';
import { IndexPluginCreator } from './indexPlugin.js';

const nodesIndex: IndexPluginCreator = async ({ keg, knut, storage }) => {
	let options = keg.kegFile.getIndex('nodes');

	async function update() {
		const filename = options?.file ?? 'dex/nodes.tsv';
		keg.dex.clear();
		for (const nodeId of await keg.storage.listNodes()) {
			const node = await keg.getNode(nodeId);
			if (node) {
				keg.dex.addNode(nodeId, node);
			}
		}

		const idList = await keg.storage.listNodes();
		for (const nodeId of idList) {
			const node = await keg.getNode(nodeId);
			if (node) {
				keg.dex.addNode(nodeId, node);
			}
		}

		const lines: string[] = [];
		for (const entry of keg.dex.entries) {
			const line = [entry.nodeId, entry.updated, entry.title].join('\t');
			lines.push(line);
		}
		const content = lines.join('\n');
		await keg.storage.write(filename, content);
	}

	const filename = options?.file ?? 'dex/nodes.tsv';
	let content = await keg.storage.read(filename);
	if (content === null) {
		await update();
		content = await keg.storage.read(filename);
	}

	invariant(
		content,
		`Expect update to make content available in ${filename}`,
	);

	const lines = content.split('\n');
	const dex = new Dex();
	for (const line of lines) {
		// ingore empty last line if it exists
		if (line === '') {
			continue;
		}
		const [id, updated, title] = line.split('\t');
		const nodeId = NodeId.parsePath(id);
		if (nodeId) {
			const entry: DexEntry = { title, updated, nodeId };
			dex.addEntry(entry);
		}
	}

	return {
		name: 'nodes',
		update,
		reload: async () => {
			options = keg.kegFile.getIndex('nodes');
			await update();
		},
	};
};

const nodesPlugin = definePlugin(({ storage }) => {
	return {
		name: 'nodes',
		searchList: [],
		indexList: [nodesIndex],
	};
});

export default nodesPlugin;
