import * as Path from 'path';
import * as YAML from 'yaml';
import { homedir } from 'os';
import { NonEmptyReadonlyArray } from 'effect/Array';
import { absurd, pipe } from 'fp-ts/lib/function.js';
import { KegVersion } from './kegFile.js';
import { Storage, StorageError } from './Storage/index.js';
import {
	deepCopy,
	Future,
	FutureResult,
	Json,
	JsonError,
	Optional,
	Result,
	Yaml,
	YamlError,
} from './Utils/index.js';

export type KegConfigDefinition = {
	enabled: boolean;
	alias: string;
	url: string;
	kegv?: KegVersion;
};

export type KnutConfigVersion = 'draft-0.1';

export type PreferedFormat = 'yaml' | 'json';

export type ConfigDefinition = {
	version?: KnutConfigVersion;
	/**
	 * Prefered format to use
	 */
	format?: PreferedFormat;
	kegs: KegConfigDefinition[];
};

export type KnutConfigFileResult<T> = Future.FutureResult<
	T,
	StorageError.StorageError | YamlError.YamlError
>;

/**
 * Represents a config file
 */
export class KnutConfigFile {
	static async fromStorage(
		storage: Storage.GenericStorage,
	): Future.FutureResult<
		KnutConfigFile,
		StorageError.StorageError | YamlError.YamlError | JsonError.JsonError
	> {
		const config = await pipe(
			// Try reading config.yaml
			storage.read('config.yaml'),
			FutureResult.chain(async (data) => {
				return KnutConfigFile.fromYAML(data, storage.uri);
			}),

			// Try reading config.json
			FutureResult.alt(async () => {
				return pipe(
					storage.read('config.json'),
					FutureResult.chain((data) => {
						return KnutConfigFile.fromJSON(data, storage.uri);
					}),
				);
			}),
		);

		return config;
	}

	static async fromJSON(
		json: string,
		root?: string,
	): Future.FutureResult<KnutConfigFile, JsonError.JsonError> {
		return Result.map(
			Json.parse<ConfigDefinition>(json),
			(data) => new KnutConfigFile(Optional.fromNullable(root), data),
		);
	}

	static async fromYAML(
		yaml: string,
		root?: string,
	): Future.FutureResult<KnutConfigFile, YamlError.YamlError> {
		return Result.map(Yaml.parse<ConfigDefinition>(yaml), (data) => {
			return new KnutConfigFile(Optional.fromNullable(root), data);
		});
	}

	static create(root?: string): KnutConfigFile {
		return new KnutConfigFile(Optional.fromNullable(root), {
			version: 'draft-0.1',
			format: 'yaml',
			kegs: [],
		});
	}

	/**
	 * Merge other configurations. This creates a brand new config
	 */
	static merge(...configurations: NonEmptyReadonlyArray<KnutConfigFile>) {
		const conf = KnutConfigFile.create();
		for (const other of configurations) {
			conf.data.format = Optional.getOrElse(
				other.data.format,
				() => conf.data.format,
			);
			for (const keg of other.data.kegs) {
				conf.upsertKegConfig(keg);
			}
		}
		return conf;
	}

	private constructor(
		private _root: Optional.Optional<string>,
		private _data: ConfigDefinition,
	) { }

	get root() {
		return this._root;
	}

	public async toStorage(args: {
		name?: string;
		format?: PreferedFormat;
		storage: Storage.GenericStorage;
	}): Future.FutureResult<true, StorageError.StorageError> {
		const format = Optional.isSome(args.format) ? args.format : this.format;
		switch (format) {
			case 'yaml': {
				const name = Optional.isSome(args.name)
					? `${args.name}.yaml`
					: 'config.yaml';
				const ok = await args.storage.write(name, this.toYAML());
				return ok;
			}
			case 'json': {
				const name = Optional.isSome(args.name)
					? `${args.name}.json`
					: 'config.json';
				const ok = await args.storage.write(name, this.toJSON());
				return ok;
			}

			default: {
				return absurd(format);
			}
		}
	}

	/**
	 * Resolve urls to some path
	 */
	resolve(root: string): KnutConfigFile {
		const next = this.clone();
		for (const keg of next.data.kegs) {
			const home = homedir();
			if (keg.url.match(/^https?/)) {
				continue;
			}
			const url = keg.url.replace(/^~/, home);
			keg.url = Path.resolve(root, url);
		}
		return next;
	}

	/**
	 * Make urls relative
	 */
	relative(root: string): KnutConfigFile {
		const next = this.clone();
		for (const keg of next.data.kegs) {
			if (keg.url.match(/^https?/)) {
				continue;
			}
			const home = homedir();
			const url = keg.url.replace(/^~/, home);
			keg.url = Path.relative(root, url);
		}
		return next;
	}

	upsertKegConfig(definition: KegConfigDefinition) {
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
			case 'json': {
				return 'config.json';
			}
			case 'yaml': {
				return 'config.yaml';
			}
			default: {
				return absurd(this.format);
			}
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

	getKeg(
		kegalias: string,
		options?: { resolution: 'relative' | 'absolute' },
	): Optional.Optional<KegConfigDefinition> {
		const data = this.data.kegs.find((a) => a.alias === kegalias);
		if (!data) {
			return null;
		}
		const url = Optional.match(this.root, {
			onSome: (root) => {
				switch (options?.resolution) {
					case 'absolute':
						return Path.resolve(root, data.url);
					case 'relative': {
						return Path.relative(root ?? '/', data.url);
					}

					default: {
						return data.url;
					}
				}
			},
			onNone: () => {
				return data.url;
			},
		});

		return {
			enabled: data.enabled,
			alias: data.alias,
			url,
			kegv: data.kegv,
		};
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
			config.upsertKegConfig(keg);
		}
		return config;
	}

	clone(): KnutConfigFile {
		const config = new KnutConfigFile(this.root, deepCopy(this.data));
		return config;
	}

	stringify() {
		switch (this.format) {
			case 'yaml': {
				return this.toYAML();
			}
			case 'json': {
				return this.toJSON();
			}
			default: {
				return absurd(this.format);
			}
		}
	}
}
