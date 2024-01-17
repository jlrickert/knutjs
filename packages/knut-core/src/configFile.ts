import * as Path from 'path';
import * as YAML from 'yaml';
import { homedir } from 'os';
import { absurd, createId } from './utils.js';
import { KegVersion } from './kegFile.js';
import {
	loadKnutStorage,
	type KnutStorage,
} from './knutStorage/knutStorage.js';
import { KnutSystemStorage } from './knutStorage/systemStorage.js';

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
	static async fromUserConfig(
		storage?: KnutStorage,
	): Promise<KnutConfigFile> {
		const store = storage ?? (await loadKnutStorage());

		new KnutConfigFile({ version: 'draft-0.1', kegs: [] });
		if (store === null) {
			return new KnutConfigFile({ version: 'draft-0.1', kegs: [] });
		}

		let config: KnutConfigFile | null = null;
		const yamlData = await store.readConfig('config.yaml');
		if (yamlData) {
			config = await KnutConfigFile.fromYAML(yamlData);
		}

		const jsonData = config ? await store.readConfig('config.json') : null;
		if (jsonData) {
			config = await KnutConfigFile.fromJSON(jsonData);
		}

		if (!config) {
			config = new KnutConfigFile({ version: 'draft-0.1', kegs: [] });
		}

		if (store instanceof KnutSystemStorage) {
			for (const keg of config.data.kegs) {
				if (/^https?/.test(keg.url)) {
					continue;
				}
				if (/^~/.test(keg.url)) {
					keg.url = keg.url.replace('~', homedir());
					continue;
				}
				if (!Path.isAbsolute(keg.url)) {
					keg.url = Path.resolve(
						Path.join(store.configRoot, keg.url),
					);
				}
			}
		}

		return config;
	}

	static async fromUserData(storage?: KnutStorage): Promise<KnutConfigFile> {
		const store = storage ?? (await loadKnutStorage());
		if (store === null) {
			return new KnutConfigFile({ version: 'draft-0.1', kegs: [] });
		}

		let config: KnutConfigFile | null = null;
		const yamlData = await store.readVar('config.yaml');
		if (yamlData) {
			config = await KnutConfigFile.fromYAML(yamlData);
		}

		const jsonData = await store.readVar('config.json');
		if (jsonData) {
			config = await KnutConfigFile.fromJSON(jsonData);
		}

		if (!config) {
			config = new KnutConfigFile({ version: 'draft-0.1', kegs: [] });
		}

		if (store instanceof KnutSystemStorage) {
			for (const keg of config.data.kegs) {
				if (/^https?/.test(keg.url)) {
					continue;
				}
				if (/^~/.test(keg.url)) {
					keg.url = keg.url.replace('~', homedir());
					continue;
				}
				if (!Path.isAbsolute(keg.url)) {
					keg.url = Path.resolve(
						Path.join(store.configRoot, keg.url),
					);
				}
			}
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

	constructor(private _data: ConfigDefinition) {}

	createId(): string {
		return createId({ count: 5 });
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
		const definition: ConfigDefinition = {
			version: this._data.version ?? 'draft-0.1',
			kegs: [],
		};
		for (const def of this._data.kegs) {
			definition.kegs.push({ ...def });
		}
		const config = new KnutConfigFile(definition);
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
