import { Knut } from '@jlrickert/knutjs-core/knut';
import { KnutCommand } from '../knut.js';
import invariant from 'tiny-invariant';
import { optional } from '@jlrickert/knutjs-core/internal/optional';

export const updateCli = KnutCommand('update').action(
	async (nodeId, options) => {
		const knut = await Knut.create();
		invariant(optional.isSome(knut), 'Current platform not detected');
		await knut.update();
	},
);
