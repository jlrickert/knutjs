import { Knut } from '@jlrickert/knutjs-core/knut';
import { NodeId } from '@jlrickert/knutjs-core/node';
import { version } from './internal/packageJSON.cjs';
import { KegSystemStorage } from '@jlrickert/knutjs-core/kegStorage/index';

export { version };

export const updateIndex = async () => {
	const knut = await Knut.create();
	const kegpath = await KegSystemStorage.findNearestKegpath();
	if (kegpath === null) {
		console.log('No keg found');
		return;
	}
	// await knut.indexUpdate(kegpath);
};

export const share = async (kegalias: string, nodeId: NodeId) => {
	const knut = await Knut.create();
	const link = await knut.share({ nodeId, kegalias });
	console.log(link);
};

export const unshare = async (kegalias: string, nodeId: NodeId) => {
	const knut = await Knut.create();
	await knut.unshare({ nodeId, kegalias });
};
