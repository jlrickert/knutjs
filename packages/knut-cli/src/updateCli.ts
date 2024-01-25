import { Knut } from '@jlrickert/knutjs-core/knut';
import { KnutCommand } from './knutCli.js';

export const update = async (): Promise<void> => {
	const knut = await Knut.fromStorage();
	await knut.update();
};

export const updateCli = KnutCommand('update')
	.description("update all index's")
	.action(update);
