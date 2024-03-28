/** @type {import("@babel/core").ConfigFunction} */
module.exports = function (api) {
	// @ts-ignore
	api.cache(true);
	return {
		presets: ['babel-preset-expo'],
		plugins: [],
	};
};
