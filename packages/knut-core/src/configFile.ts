import * as Path from 'path';
import * as YAML from 'yaml';
import { absurd, deepCopy, stringify } from './utils.js';
import { KegVersion } from './kegFile.js';
import { GenericStorage } from './storage/storage.js';
import { homedir } from 'os';

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
	): Promise<KnutConfigFile | null> {
		let config: KnutConfigFile | null = null;

		const yamlData = await storage.read('config.yaml');
		if (yamlData) {
			config = await KnutConfigFile.fromYAML(yamlData);
		}

		if (!config) {
			const jsonData = await storage.read('config.json');
			if (jsonData) {
				config = await KnutConfigFile.fromJSON(jsonData);
			}
		}

		if (!config) {
			config = KnutConfigFile.create();
		}

		return config;
	}

	static async fromJSON(json: string): Promise<KnutConfigFile | null> {
		const value = JSON.parse(json) as ConfigDefinition;
		const config = new KnutConfigFile(value);
		return config;
	}

	static async fromYAML(yaml: string): Promise<KnutConfigFile | null> {
		const data = YAML.parse(yaml) as ConfigDefinition;
		return new KnutConfigFile(data);
	}

	static create(): KnutConfigFile {
		return new KnutConfigFile({
			version: 'draft-0.1',
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
	async resolve(path: string): Promise<KnutConfigFile> {
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
	async relative(path: string): Promise<KnutConfigFile> {
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
