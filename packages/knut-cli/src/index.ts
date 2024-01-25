import { Knut } from '@jlrickert/knutjs-core/knut';
import { NodeId } from '@jlrickert/knutjs-core/node';
import { version } from './internal/packageJSON.cjs';
import { KegSystemStorage } from '@jlrickert/knutjs-core/kegStorage/index';

export { version };

export const updateIndex = async () => {
	const knut = await Knut.fromStorage();
	const kegpath = await KegSystemStorage.findNearestKegpath();
	if (kegpath === null) {
		console.log('No keg found');
		return;
	}
	await knut.update();
};

export const share = async (kegalias: string, nodeId: NodeId) => {
	const knut = await Knut.fromStorage();
	const link = await knut.share({ nodeId, kegalias });
	console.log(link);
};

export const unshare = async (kegalias: string, nodeId: NodeId) => {
	const knut = await Knut.fromStorage();
	await knut.unshare({ nodeId, kegalias });
};
