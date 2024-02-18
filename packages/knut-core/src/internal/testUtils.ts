import * as Path from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterEach, expect } from 'vitest';
import invariant from 'tiny-invariant';
import { absurd, pipe } from 'fp-ts/lib/function.js';
import { Knut } from '../knut.js';
import { GenericStorage } from '../storage/storage.js';
import { Keg } from '../keg.js';
import { EnvStorage, envStorageM } from '../envStorage.js';
import { currentPlatform } from '../utils.js';
import { WebStorage } from '../storage/webStorage.js';
import { MyPromise, promise } from './myPromise.js';
import { sequenceS } from 'fp-ts/lib/Apply.js';
import { fromUri } from '../storage/storageUtils.js';
import { Optional as MyOption, optional } from './optional.js';
import { optionT, option as O } from 'fp-ts';

export type FileSystemTestContext = {
	getRoot: () => Promise<string>;
	getCacheDir: () => Promise<string>;
	getConfigDir: () => Promise<string>;
	getVarDir: () => Promise<string>;
	reset: () => Promise<void>;
};

export type TestStorageContext = {
	storage: GenericStorage;
	reset: () => Promise<void>;
};

export type TestContext = {
	knut: Knut;
	storage: GenericStorage;
	reset(): Promise<void>;
};

export type TestKegContext = {
	keg: Keg;
	reset: () => Promise<void>;
};

export const testUtilsM = {
	unwrap<A>(ma: MyOption<A>): A {
		expect(optional.isSome(ma)).toBeTruthy();
		invariant(
			optional.isSome(ma),
			'Expect vitext expect to stop execution when value is none',
		);
		return ma;
	},

	testDataPath: Path.resolve(__dirname, '..', '..', 'testdata'),

	/**
	 * Path to sample keg fixture
	 **/
	get sampleKegpath() {
		return Path.resolve(this.testDataPath, 'samplekeg');
	},

	/**
	 * Config path to the config test fixtures
	 **/
	get configPath() {
		return Path.resolve(this.testDataPath, 'config', 'knut');
	},

	/**
	 * Variable path to fixtures
	 **/
	get varPath() {
		return Path.resolve(this.testDataPath, 'share/data/knut');
	},

	/**
	 * Path to cache fixture
	 **/
	get cachePath() {
		return Path.resolve(this.testDataPath, 'testdata/cache/knut');
	},

	/**
	 * Create a temporary directory for use within a node environment. This
	 * automatically cleans up during tests.
	 **/
	async createFilesystemContext(): Promise<FileSystemTestContext> {
		let rootTestDir: string | null = null;

		const getRoot = async () => {
			if (!rootTestDir) {
				rootTestDir = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
			}
			return rootTestDir;
		};

		const reset = async () => {
			if (rootTestDir) {
				await rm(rootTestDir, { recursive: true });
				rootTestDir = null;
			}
		};

		const getCacheDir = async () => {
			return Path.join(await getRoot(), 'cache');
		};

		const getConfigDir = async () => {
			return Path.join(await getRoot(), 'config');
		};

		const getVarDir = async () => {
			return Path.join(await getRoot(), 'var');
		};

		// TODO(jared): only add cleanup on tests
		// see https://vitest.dev/guide/in-source.html
		afterEach(async () => {
			await reset();
		});

		return {
			getRoot,
			getCacheDir,
			getConfigDir,
			getVarDir,
			reset,
		};
	},

	/**
	 * Create a test env storage depending on the underling platform
	 **/
	async createTestEnv(): MyPromise<EnvStorage> {
		switch (currentPlatform) {
			case 'node': {
				const fsCtx = await testUtilsM.createFilesystemContext();
				const cache = await pipe(
					fsCtx.getCacheDir(),
					promise.map(fromUri),
					promise.map(O.fromNullable),
				);
				const variable = await pipe(
					fsCtx.getVarDir(),
					promise.map(fromUri),
					promise.map(O.fromNullable),
				);
				const config = await pipe(
					fsCtx.getConfigDir(),
					promise.map(fromUri),
					promise.map(O.fromNullable),
				);
				const env = await pipe(
					sequenceS(O.Monad)({
						config,
						variable,
						cache,
					}),
					O.map(envStorageM.make),
					promise.of,

					// do the overwrite side effects
					optionT.chain(promise.Monad)(async (env) => {
						const { cache, variable, config } = env;
						const traverse = optional.traverse(promise.Monad);

						const overwrite = async (
							srcPath: string,
							dest: GenericStorage,
						) => {
							await pipe(
								fromUri(srcPath),
								traverse((src) => src.overwrite(dest)),
							);
						};

						await overwrite(testUtilsM.configPath, config);
						await overwrite(testUtilsM.varPath, variable);
						await overwrite(testUtilsM.cachePath, cache);

						return O.some(env);
					}),
				);

				invariant(O.isSome(env), 'Expect env to be loaded for tests');

				return env.value;
			}
			case 'dom': {
				const env = await envStorageM.domEnv();
				// TODO(Jared): Figure out how to copy data here
				// return env
				return env;
			}

			default: {
				return absurd(currentPlatform);
			}
		}
	},

	/**
	 * Create a test samplekeg storage
	 **/
	async createSamplekegStorage(): MyPromise<GenericStorage> {
		switch (currentPlatform) {
			case 'dom': {
				return WebStorage.create();
			}
			case 'node': {
				const fixture = fromUri(this.sampleKegpath);
				const storage = (await this.createEmptyStorage()).child(
					'samplekeg',
				);
				invariant(optional.isSome(fixture));
				await fixture.overwrite(storage);
				return storage;
			}

			default: {
				return absurd(currentPlatform);
			}
		}
	},

	/**
	 * Create an empty storage of the appropriate type for the platform
	 **/
	async createEmptyStorage() {
		const ctx = await this.createFilesystemContext();
		const storage = fromUri(await ctx.getRoot());
		invariant(
			optional.isSome(storage),
			'Expect storage to be available for tests',
		);
		return storage;
	},

	/**
	 * Create a test context
	 **/
	async createTestPlatform() {
		const env = await this.createTestEnv();
		const sampleKegStorage = await this.createSamplekegStorage();
		return { env, sampleKegStorage };
	},

	async createTestKnut() {
		const env = await this.createTestEnv();
		const knut = await Knut.fromEnvironment(env);
		return knut;
	},

	async createTestKeg() {
		const { sampleKegStorage, env } = await this.createTestPlatform();
		const keg = await Keg.fromStorage(sampleKegStorage, env);
		invariant(optional.isSome(keg), 'Expect test keg to load for testing');
		return keg;
	},
};
