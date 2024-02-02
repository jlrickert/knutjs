import { Knut } from '@jlrickert/knutjs-core/knut';
import { KnutCommand } from './knutCli.js';

export const updateCli = KnutCommand('update').action(
	async (nodeId, options) => {
		const knut = await Knut.create();
		await knut.update();
	},
);