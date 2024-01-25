import { defineConfig, type Options } from 'tsup';
import path from 'path';

const env = process.env.NODE_ENV;
const isProduction = env === 'production';

const commonConfig: Options = {
	banner: {
		// js: "'use client'"
	},
	clean: true,
	sourcemap: isProduction,
	format: ['esm'],
	bundle: isProduction,
	minify: isProduction,
	dts: true,
	treeshake: true,
	external: ['react'],
	splitting: true,
	target: 'es2020',
	outDir: 'dist',
	tsconfig: path.resolve(__dirname, './tsconfig.json'),
	skipNodeModulesBundle: true,
};

export default defineConfig(() => {
	return [
		{
			entry: ['./src/index.ts'],
			...commonConfig,
			esbuildOptions: (options) => {
				options.outbase = 'src';
			},
			// the index doesn't need to be bundled
			bundle: false,
		},
		{
			entry: ['./src/**/!(index).ts'],
			...commonConfig,
			esbuildOptions: (options) => {
				options.outbase = 'src';
			},
		},
	];
});
