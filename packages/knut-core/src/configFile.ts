import * as Path from 'path';
import * as YAML from 'yaml';
import { homedir } from 'os';
import { absurd, pipe } from 'fp-ts/lib/function.js';
import { deepCopy, stringify } from './utils.js';
import { KegVersion } from './kegFile.js';
import { GenericStorage } from './storage/storage.js';
import { Optional, optional } from './internal/optional.js';
import { optionalT } from './internal/optionalT.js';
import { Future, future } from './internal/future.js';

export type KegConfigDefinition = {
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

/**
 * Represents a config file
 */
export class KnutConfigFile {
	static async fromStorage(
		storage: GenericStorage,
	): Future<Optional<KnutConfigFile>> {
		const t = optionalT(future.Monad);
		const config = await pipe(
			// Try reading config.yaml
			storage.read('config.yaml'),
			t.chain((data) => KnutConfigFile.fromYAML(data, storage.root)),

			// Try reading config.json
			t.alt(() => {
				return pipe(
					storage.read('config.json'),
					t.chain((data) =>
						KnutConfigFile.fromJSON(data, storage.root),
					),
				);
			}),
		);

		return config;
	}

	static async fromJSON(
		json: string,
		root?: string,
	): Future<Optional<KnutConfigFile>> {
		const value = JSON.parse(json) as ConfigDefinition;
		const config = new KnutConfigFile(optional.fromNullable(root), value);
		return config;
	}

	static async fromYAML(
		yaml: string,
		root?: string,
	): Future<Optional<KnutConfigFile>> {
		const data = YAML.parse(yaml) as ConfigDefinition;
		return new KnutConfigFile(optional.fromNullable(root), data);
	}

	static create(root?: string): KnutConfigFile {
		return new KnutConfigFile(optional.fromNullable(root), {
			version: 'draft-0.1',
			kegs: [],
		});
	}

	constructor(
		private _root: Optional<string>,
		private _data: ConfigDefinition,
	) {}

	get root() {
		return this._root;
	}

	async writeTo(storage: GenericStorage): Future<boolean> {
		const filename =
			this.data.format === 'yaml' ? 'config.yaml' : 'config.json';
		const ok = await storage.write(filename, stringify(this));
		return ok;
	}

	/**
	 * Resolve urls to some path
	 **/
	resolve(): KnutConfigFile {
		const next = this.clone();
		for (const keg of next.data.kegs) {
			const home = homedir();
			const url = keg.url.replace(/^~/, home);
			keg.url = pipe(
				this.root,
				optional.map((root) => Path.resolve(root, url)),
				optional.getOrElse(() => url),
			);
			keg.url = this.root ? Path.resolve(this.root, url) : url;
		}
		return next;
	}

	/**
	 * Make urls relative
	 **/
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

	getKeg(kegalias: string): Optional<KegConfigDefinition> {
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
		const config = new KnutConfigFile(this.root, deepCopy(this.data));
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
