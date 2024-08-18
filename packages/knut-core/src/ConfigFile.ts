import * as Path from 'path';
import * as YAML from 'yaml';
import { homedir } from 'os';
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
		const result = Json.parse<ConfigDefinition>(json);
		return Result.map(
			result,
			(data) => new KnutConfigFile(Optional.fromNullable(root), data),
		);
	}

	static async fromYAML(
		yaml: string,
		root?: string,
	): Future.FutureResult<KnutConfigFile, YamlError.YamlError> {
		const result = Yaml.parse<ConfigDefinition>(yaml);
		return Result.map(result, (data) => {
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

	constructor(
		private _root: Optional.Optional<string>,
		private _data: ConfigDefinition,
	) {}

	get root() {
		return this._root;
	}

	async toStorage(
		storage: Storage.GenericStorage,
	): Future.FutureResult<true, StorageError.StorageError> {
		switch (this.format) {
			case 'yaml': {
				const ok = await storage.write('config.yaml', this.toYAML());
				return ok;
			}
			case 'json': {
				const ok = await storage.write('config.json', this.toYAML());
				return ok;
			}

			default: {
				return absurd(this.format);
			}
		}
	}

	/**
	 * Resolve urls to some path
	 */
	resolve(): KnutConfigFile {
		const next = this.clone();
		for (const keg of next.data.kegs) {
			const home = homedir();
			const url = keg.url.replace(/^~/, home);
			keg.url = pipe(
				this.root,
				Optional.map((root) => Path.resolve(root, url)),
				Optional.getOrElse(() => url),
			);
			keg.url = this.root ? Path.resolve(this.root, url) : url;
		}
		return next;
	}

	/**
	 * Make urls relative
	 */
	relative(): KnutConfigFile {
		const next = this.clone();
		const root = this.root ?? '/';
		if (root.match(/^https?/)) {
			return next;
		}
		for (const keg of next.data.kegs) {
			const home = homedir();
			const url = keg.url.replace(/^~/, home);
			keg.url = Path.relative(root ?? '/', url);
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
			config.updateKegConfig(keg);
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
