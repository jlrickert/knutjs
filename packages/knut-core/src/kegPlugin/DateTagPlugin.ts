import { createKegPlugin } from './KegPlugin';

export const DateTagPlugin = async () => {
	return createKegPlugin({
		onInit: async ({ keg }, next) => {
			keg.config.data.plugins;
		},
		onUpdate: async ({ keg }, next) => { },
		onConfigReload: async ({ keg }, next) => { },
	});
};
