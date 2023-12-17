import { defineConfig, type Options } from 'tsup';
import path from 'path';

const env = process.env.NODE_ENV;
const isProduction = env === 'production';

const commonConfig: Options = {
	sourcemap: isProduction,
	format: ['cjs', 'esm'],
	bundle: true,
	minify: isProduction,
	dts: true,
	treeshake: true,
	target: 'es2018',
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
		},
		{
			entry: ['./src/cli.ts'],
			...commonConfig,
			banner: {
				js: '#!/usr/bin/env node',
			},
			esbuildOptions: (options) => {
				options.outbase = 'src';
			},
		},
	];
});
