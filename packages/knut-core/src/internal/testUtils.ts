import { Kind, URIS } from 'fp-ts/HKT';
import * as Path from 'path';
import invariant from 'tiny-invariant';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { afterEach } from 'vitest';
import { Optional, optional } from './optional.js';
import { Future, future } from './future.js';
import { Knut } from '../knut.js';
import { Keg } from '../keg.js';
import { overwrite } from '../storage/storageUtils.js';
import { GenericStorage } from '../storage/storage.js';
import { NodeStorage } from '../storage/nodeStorage.js';
import { EnvStorage } from '../envStorage.js';
import { KegStorage } from '../kegStorage.js';
import { Platform, platform } from '../platform.js';
import { pipe } from 'fp-ts/lib/function.js';

export type Kegpath = 'samplekeg1' | 'samplekeg2' | 'samplekeg3';

export class TestContext {
	/**
	 * root path for fixtures
	 **/
	static fixturePath = Path.resolve(__dirname, '..', '..', 'testdata');

	/**
	 * Path to sample keg fixture
	 **/
	static fixtureKegpath = (Kegpath: Kegpath) =>
		Path.resolve(TestContext.fixturePath, Kegpath);

	/**
	 * Config path to the config test fixtures
	 **/
	static fixtureConfigPath = Path.resolve(
		TestContext.fixturePath,
		'config/knut',
	);

	/**
	 * Variable path to fixtures
	 **/
	static fixtureVarPath = Path.resolve(
		TestContext.fixturePath,
		'local/share/knut',
	);

	/**
	 * Path to cache fixture
	 **/
	static fixtureCachePath = Path.resolve(
		TestContext.fixturePath,
		'cache/knut',
	);

	/**
	 * Create a temporary directory for use within a node environment. This
	 * automatically cleans up during tests.
	 **/
	static async nodeContext(): Future<TestContext> {
		const rootPath = await mkdtemp(Path.join(tmpdir(), 'knut-test-'));
		const root = new NodeStorage(rootPath);
		const fixture = new NodeStorage(TestContext.fixturePath);

		const context = new TestContext(root, fixture);

		// TODO(jared): only add cleanup on tests
		// see https://vitest.dev/guide/in-source.html
		afterEach(async () => {
			if (root instanceof NodeStorage) {
				try {
					await context.reset();
					await rm(root.root, { recursive: true });
				} catch (e) {}
			}
		});

		return context;
	}

	private constructor(
		public readonly root: GenericStorage,
		public fixture: GenericStorage,
	) {}

	async reset() {
		// this.root.rmdir('');
	}

	getEnv() {
		const cache = this.root.child('cache/knut');
		const variable = this.root.child('local/share/knut');
		const config = this.root.child('config/knut');
		const env = EnvStorage.fromStorage({
			config,
			variable,
			cache,
		});
		return env;
	}

	setEnv(env: EnvStorage) {
		return <
			M extends URIS,
			F extends (...params: unknown[]) => Kind<M, unknown>,
		>(
			f: F,
		): F => {
			return ((...args: any[]): any => {
				platform.setStorage(env);
				const output = f(...args);
				return output;
			}) as any;
		};
	}

	async popluateFixture() {
		await this.populateEnv();
		await this.populateKegs();
		return this;
	}

	async populateEnv() {
		await overwrite(
			this.fixture.child(TestContext.fixtureConfigPath),
			this.root.child('config/knut'),
		);
		await overwrite(
			this.fixture.child(TestContext.fixtureVarPath),
			this.root.child('local/share/knut'),
		);
		await overwrite(
			this.fixture.child(TestContext.fixtureCachePath),
			this.root.child('cache/knut'),
		);
		return this;
	}

	async populateKegs() {
		const kegpaths: Kegpath[] = ['samplekeg1', 'samplekeg2', 'samplekeg3'];
		for (const kegpath of kegpaths) {
			const fixture = this.fixture.child(
				TestContext.fixtureKegpath(kegpath),
			);
			const storage = KegStorage.fromStorage(this.root.child(kegpath));
			await overwrite(fixture, storage);
		}
		return this;
	}

	async getKeg(kegpath: Kegpath) {
		const storage = KegStorage.fromStorage(this.root.child(kegpath));
		const keg = await Keg.fromStorage(storage);
		invariant(
			optional.isSome(keg),
			'Expect fixtures to be populated. run .populateKegs',
		);
		return keg;
	}

	async getKnut() {
		const env = this.getEnv();
		const knut = await Knut.fromEnvironment(env);
		return knut;
	}
}

const getKeg: (name: string) => Platform<Future<Optional<Keg>>> =
	(kegpath) =>
	({ storage }) =>
		pipe(
			storage.child(kegpath),
			KegStorage.fromStorage,
			future.chain(Keg.fromStorage),
		);

export const testUtils = {
	getKeg,
};
