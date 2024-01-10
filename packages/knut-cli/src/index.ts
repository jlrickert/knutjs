import { Knut, SearchStrategy } from '@jlrickert/knutjs-core/knut';
import { NodeId } from '@jlrickert/knutjs-core/node';
import { FileSystemStorage } from '@jlrickert/knutjs-core/storage';
import { version } from './internal/packageJSON.cjs';

export { version };

export const updateIndex = async () => {
	const kegpath = await FileSystemStorage.findNearestKegpath();
	if (kegpath === null) {
		console.log('No keg found');
		return;
	}
	const storage = new FileSystemStorage({ kegpath });
	const knut = await Knut.load({ [kegpath]: { storage } });
	await knut.indexUpdate(kegpath);
};

export const create = async () => {
	const kegpath = await FileSystemStorage.findNearestKegpath();
	if (!kegpath) {
		console.log('No keg found');
		return;
	}
	const storage = new FileSystemStorage({ kegpath });
	const knut = await Knut.load({ [kegpath]: { storage } });
	await knut.nodeCreate({ kegalias: kegpath, content: '' });
};

const loadNearest = async (): Promise<
	{ ok: true; kegpath: string; knut: Knut } | { ok: false; message: string }
> => {
	const kegpath = await FileSystemStorage.findNearestKegpath();
	if (!kegpath) {
		return { ok: false, message: 'No keg found' };
	}
	const storage = new FileSystemStorage({ kegpath });
	const knut = await Knut.load({ [kegpath]: { storage } });
	return { ok: true, kegpath, knut };
};

export const edit = async (
	nodeId: string,
	options?: { interactive?: boolean },
) => {
	const result = await loadNearest();
	if (!result.ok) {
		console.log(result.message);
		return;
	}
	const { kegpath, knut } = result;

	// TODO(Jared) open in an editor and continue with content
	const content = '';
	await knut.nodeWrite({ kegalias: kegpath, nodeId, content });
};

export const view = async (nodeId: NodeId) => {
	const result = await loadNearest();
	if (!result.ok) {
		console.log(result.message);
		return;
	}
	const { kegpath, knut } = result;
	await knut.nodeRead({ kegalias: kegpath, nodeId });
};

export const share = async (nodeId: NodeId, options?: { kegpath?: string }) => {
	const result = await loadNearest();
	if (!result.ok) {
		console.log(result.message);
		return;
	}
	const { kegpath, knut } = result;
	const link = await knut.share({ nodeId, kegalias: kegpath });

	console.log(link);
	console.log('rawr');
};

export const unshare = async (nodeId: NodeId) => {
	const result = await loadNearest();
	if (!result.ok) {
		console.log(result.message);
		return;
	}
	const { kegpath, knut } = result;
	await knut.unshare({ nodeId, kegalias: kegpath });
};
