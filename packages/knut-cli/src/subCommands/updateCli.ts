import { pipe } from 'fp-ts/lib/function.js';
import { Knut } from '@jlrickert/knutjs-core/knut';
import { Action, Cmd, cmd } from '../command.js';
import { Backend } from '../backend.js';

export const update: Backend<Action<void, { alias: string[] }>> = cmd.action(
	(_, __) => async (ctx) => {
		const knut = await Knut.fromBackend(ctx);
		await knut.update();
	},
);

export const updateCli: Cmd = pipe(cmd.make('update'), cmd.addAction(update));
