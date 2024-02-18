import * as Path from 'path';
import * as YAML from 'yaml';
import { homedir } from 'os';
import { MY_JSON, absurd, deepCopy, stringify } from './utils.js';
import { KegVersion } from './kegFile.js';
import { GenericStorage } from './storage/storage.js';
import { EnvStorage } from './envStorage.js';
import { pipe } from 'fp-ts/lib/function.js';
import { MyPromise, promise } from './internal/myPromise.js';
import { Optional, optional } from './internal/optional.js';
import { optionalT } from './internal/optionalT.js';

export type KegConfigDefinition = {
	alias: string;
	url: string;
	kegv?: KegVersion;
};

export type KnutPluginDefinition = {
	name?: string;
} & { [key: string]: MY_JSON };

export type KnutConfigVersion = 'draft-0.1';

export type PreferedFormat = 'yaml' | 'json';

export type ConfigDefinition = {
	version?: KnutConfigVersion;
	/**
	 * Prefered format to use
	 */
	format?: PreferedFormat;
	defaultSearch?: string;
	plugins: KnutPluginDefinition[];
	kegs: KegConfigDefinition[];
};

const T = optionalT(promise.Monad);

/**
 * Represents a config file
 */
export class KnutConfigFile {
	static async fromEnvStorage(
		env: EnvStorage,
		options?: { resolve: boolean },
	): MyPromise<KnutConfigFile> {
		const f = async (storage: GenericStorage) => {
			return pipe(
				KnutConfigFile.fromStorage(storage),
				T.getOrElse(async () => KnutConfigFile.create()),
				promise.chain((a) => {
					return options?.resolve === true
						? a.resolve(storage.root)
						: promise.of(a);
				}),
			);
		};

		const varConfig = await f(env.variable);
		const userConfig = await f(env.config);
		const configFile = varConfig.concat(userConfig);
		return configFile;
	}

	static async fromStorage(
		storage: GenericStorage,
	): MyPromise<Optional<KnutConfigFile>> {
		const T = optionalT(promise.Monad);
		const config = await pipe(
			storage.read('config.yaml'),
			T.chain(KnutConfigFile.fromYAML),

			T.alt(() =>
				pipe(
					storage.read('config.json'),
					T.chain(KnutConfigFile.fromJSON),
				),
			),
		);

		return config;
	}

	static async fromJSON(json: string): MyPromise<Optional<KnutConfigFile>> {
		const value = JSON.parse(json) as ConfigDefinition;
		const config = new KnutConfigFile(value);
		return config;
	}

	static async fromYAML(yaml: string): MyPromise<Optional<KnutConfigFile>> {
		return pipe(
			YAML.parse(yaml) as ConfigDefinition,
			(data) => new KnutConfigFile(data),
			optional.some,
		);
	}

	static create(): KnutConfigFile {
		return new KnutConfigFile({
			version: 'draft-0.1',
			plugins: [],
			kegs: [],
		});
	}

	constructor(private _data: ConfigDefinition) {}

	async writeTo(storage: GenericStorage): Promise<boolean> {
		const filename =
			this.data.format === 'yaml' ? 'config.yaml' : 'config.json';
		const ok = await storage.write(filename, stringify(this));
		return ok;
	}

	/**
	 * Resolve urls to some path
	 **/
	async resolve(path: string): MyPromise<KnutConfigFile> {
		const next = this.clone();
		for (const keg of next.data.kegs) {
			const home = homedir();
			const url = keg.url.replace(/^~/, home);
			keg.url = Path.resolve(path, url);
		}
		return next;
	}

	/**
	 * Make urls relative
	 **/
	async relative(path: string): MyPromise<KnutConfigFile> {
		const next = this.clone();
		if (path.match(/^https?/)) {
			return next;
		}
		for (const keg of next.data.kegs) {
			const home = homedir();
			const url = keg.url.replace(/^~/, home);
			keg.url = Path.relative(path, url);
		}
		return next;
	}

	updateKegConfig(definition: KegConfigDefinition) {
		const index = this._data.kegs.findIndex(
			(a) => a.alias === definition.alias,
		);
		if (index >= 0) {
			this._data.kegs[index] = definition;
		} else {
			this._data.kegs.push(definition);
		}
	}

	get filepath(): string {
		switch (this.format) {
			case 'json':
				return 'config.json';
			case 'yaml':
				return 'config.yaml';
			default:
				return absurd(this.format);
		}
	}

	get format(): PreferedFormat {
		return this.data.format ?? 'yaml';
	}

	set format(v: PreferedFormat) {
		this.data.format = v;
	}

	get data(): ConfigDefinition {
		return this._data;
	}

	getKeg(kegalias: string): KegConfigDefinition | null {
		const data = this.data.kegs.find((a) => a.alias === kegalias);
		if (!data) {
			return null;
		}

		return { alias: data.alias, url: data.url, kegv: data.kegv };
	}

	deleteKeg(kegalias: string) {
		this._data.kegs = this._data.kegs.filter((a) => a.alias !== kegalias);
	}

	toYAML(): string {
		return YAML.stringify(this._data);
	}

	toJSON() {
		return JSON.stringify(this._data);
	}

	concat(other: KnutConfigFile): KnutConfigFile {
		const config = this.clone();
		for (const keg of other._data.kegs) {
			config.updateKegConfig(keg);
		}
		return config;
	}

	clone(): KnutConfigFile {
		const config = new KnutConfigFile(deepCopy(this.data));
		return config;
	}

	stringify() {
		switch (this.data.format) {
			case 'yaml':
				return this.toYAML();
			case 'json':
				return this.toJSON();
			default:
				return this.toYAML();
		}
	}
}
