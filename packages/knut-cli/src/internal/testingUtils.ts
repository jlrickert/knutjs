import { Command } from 'commander';
import { Mock, vi } from 'vitest';
import * as Path from 'path';
import { testUtils } from '@jlrickert/knutjs-core/internal/testUtils.js';

export const testingUtils = {
	mockAction<Arg, Opts>(): Mock<[Arg, Opts, Command], void> {
		return vi.fn();
	},

	async captureOutput(f: () => Promise<void>): Promise<string[]> {
		const original = console.log;

		let chunks: string[] = [];
		console.log = (chunk) => {
			chunks.push(chunk);
			return true;
		};

		await f();

		console.log = original;
		return chunks;
	},

	configFile() {
		return Path.resolve(testUtils.knutConfigPath, 'config.yaml');
	},
};
