import { defineConfig, type Options } from 'tsup';
import path from 'path';

const env = process.env.NODE_ENV;
const isProduction = env === 'production';

const commonConfig: Options = {
	banner: {
		// js: "'use client'"
	},
	sourcemap: isProduction,
	format: ['cjs', 'esm'],
	minify: isProduction,
	dts: true,
	external: ['react'],
	target: 'es2022',
	outDir: 'dist',
	tsconfig: path.resolve(__dirname, './tsconfig.build.json'),
	skipNodeModulesBundle: true,
	clean: isProduction,
	platform: 'neutral',
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
		},
		// {
		// 	entry: ['./src/**/!(index).ts'],
		// 	...commonConfig,
		// 	esbuildOptions: (options) => {
		// 		options.outbase = 'src';
		// 	},
		// },
	];
});
