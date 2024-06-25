import type { UserConfig } from 'vitest/config';

const config: UserConfig = {
	esbuild: {
		target: 'es2022',
	},
	test: {
		include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
	},
};

export default config;
