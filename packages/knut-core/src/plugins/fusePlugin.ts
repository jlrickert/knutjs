import { KegPlugin, KegPluginContext } from '../internal/plugins/kegPlugin.js';

export class FusePlugin implements KegPlugin {
	name = 'fuse';
	depends = ['nodes'];
	summary? = 'Fuse search';
	async activate(ctx: KegPluginContext): Promise<void> {
		ctx.registerIndex({
			name: 'fuse',
			depends: ['nodes'],
			update: async () => {},
		});
	}
	async deactivate(ctx: KegPluginContext): Promise<void> {}

	search() {}

	async updateIndex(keg: Keg): Promise<void> {
		return;
	}
}
