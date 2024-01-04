import { Knut, SearchStrategy } from '@jlrickert/knutjs-core/knut';
import { type NodeId } from '@jlrickert/knutjs-core/node';
import { KegFile } from '@jlrickert/knutjs-core/KegFile';
import { type Storage } from '@jlrickert/knutjs-core/storage';
import { version } from './packageJSON.cjs';

export { version };

export const updateIndex = async () => {
	const kegpath = KegFile.findNearest();
	const knut = new Knut();
	await knut.indexUpdate(kegpath);
};

export const search = async (
	query: string,
	options?: {
		pager?: boolean;
		tags?: string[];
		strategy?: SearchStrategy;
		storage?: Storage;
	},
) => {
	const kegpath = KegFile.findNearest();
	const knut = Knut.load({ [kegpath]: { storage: kegpath } });
	const results = await knut.search(kegpath, {
		content: { $query: query },
		// tags: options?.tags,
	});
	const nodes = results
		.sort((a, b) => a.rank - b.rank)
		.map(({ nodeId }) => nodeId);

	console.log({ nodes: nodes.join(' ') });
};

export const create = async () => {
	const kegpath = KegFile.findNearest();
	const knut = new Knut();
	await knut.nodeCreate({ kegpath, content: '' });
};

export const edit = async (
	nodeId: NodeId,
	options?: { interactive?: boolean },
) => {
	const kegpath = KegFile.findNearest();
	console.log({ kegpath });
	const knut = new Knut();
	// TODO(Jared) open in an editor and continue with content
	const content = '';
	await knut.nodeUpdate({ kegpath, nodeId, content });
};

export const view = async (nodeId: NodeId) => {
	const kegpath = KegFile.findNearest();
	const knut = new Knut();
	await knut.nodeRead({ kegpath, nodeId });
};

export const share = async (nodeId: NodeId, options?: { kegpath?: string }) => {
	const kegpath = options?.kegpath ?? KegFile.findNearest();
	const knut = new Knut();
	const link = await knut.share({ nodeId, kegpath });

	console.log(link);
	console.log('rawr');
};

export const unshare = async (nodeId: NodeId) => {
	const kegpath = KegFile.findNearest();
	const knut = new Knut();
	await knut.unshare({ nodeId, kegpath });
};
