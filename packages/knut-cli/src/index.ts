import { Knut, SearchStrategy } from '@jlrickert/knutjs-core/knut';
import { Keg } from '@jlrickert/knutjs-core/keg';
import { NodeId } from '@jlrickert/knutjs-core/node';
import { version } from '../package.json';

export { version };

export const updateIndex = () => {
	const kegpath = Keg.findNearest();
	const knut = new Knut();
	knut.indexUpdate(kegpath);
};

export const search = (
	query: string,
	options?: {
		pager?: boolean;
		strategy?: SearchStrategy;
	},
) => {
	const kegpath = Keg.findNearest();
	const knut = new Knut();
	const results = knut.search(kegpath, { content: { $query: query } });
	const nodes = results
		.sort((a, b) => a.rank - b.rank)
		.map(({ nodeId }) => nodeId);
	console.log(nodes.join(' '));
};

export const create = () => {
	const kegpath = Keg.findNearest();
	const knut = new Knut();
	knut.nodeCreate({ kegpath, content: '' });
};

export const edit = (nodeId: NodeId, options?: { interactive?: boolean }) => {
	const kegpath = Keg.findNearest();
	const knut = new Knut();
	// TODO(Jared) open in an editor and continue with content
	const content = '';
	knut.nodeUpdate({ kegpath, nodeId, content });
};

export const view = (nodeId: NodeId) => {
	const kegpath = Keg.findNearest();
	const knut = new Knut();
	knut.nodeRead({ kegpath, nodeId });
};

export const share = (nodeId: NodeId) => {
	const kegpath = Keg.findNearest();
	const knut = new Knut();
	knut.share({ nodeId, kegpath });
};

export const unshare = (nodeId: NodeId) => {
	const kegpath = Keg.findNearest();
	const knut = new Knut();
	knut.unshare({ nodeId, kegpath });
};
