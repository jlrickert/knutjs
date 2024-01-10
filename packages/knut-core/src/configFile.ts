import * as YAML from 'yaml';
import * as Path from 'path';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { createId } from './utils.js';
import { homedir } from 'os';
import { KegVersion } from './kegFile.js';

const getUserCacheDir = async (): Promise<string | null> => {
	const platform = process.platform;
	switch (platform) {
		case 'win32': {
			const dir = process.env.LOCALAPPDATA || '';
			if (dir === '') {
				return null;
			}
			return dir;
		}

		case 'darwin': {
			let home = homedir();
			if (home === '') {
				return null;
			}
			return Path.join(home, 'Library', 'Caches');
		}
		case 'linux': {
			const cacheHome = process.env.XDG_CACHE_HOME || '';
			if (cacheHome !== '') {
				return cacheHome;
			}
			const home = homedir();
			if (home === '') {
				return null;
			}
			return Path.join(home, '.cache');
		}
		default: {
			throw new Error(`Platform ${platform} not supported`);
		}
	}
};

const getUserConfigDir = async (): Promise<string | null> => {
	const platform = process.platform;
	switch (platform) {
		case 'win32': {
			const dir = process.env.APPDATA || '';
			if (dir === '') {
				return null;
			}
			return dir;
		}

		case 'darwin': {
			const cacheHome = process.env.XDG_CONFIG_HOME || '';
			if (cacheHome !== '') {
				return cacheHome;
			}
			const home = homedir();
			if (home === '') {
				return null;
			}
			return Path.join(home, '.cache');
		}
		case 'linux': {
			const cacheHome = process.env.XDG_CACHE_HOME || '';
			if (cacheHome !== '') {
				return cacheHome;
			}
			const home = homedir();
			if (home === '') {
				return null;
			}
			return Path.join(home, '.cache');
		}
		default: {
			throw new Error(`Platform ${platform} not supported`);
		}
	}
};

type KegConfigDefinition = {
	alias: string;
	url: string;
	kegv?: KegVersion;
};

type KnutConfigVersion = 'draft-0.1';

type ConfigDefinition = {
	version?: KnutConfigVersion;
	kegs: KegConfigDefinition[];
};

export class ConfigFile {
	static async fromCurrentBrowser(): Promise<ConfigFile | null> {
		if (
			typeof window === 'undefined' ||
			typeof window.localStorage === 'undefined'
		) {
			throw new Error('WebStorage not supported');
		}
		const value = window.localStorage.getItem('knutConfig');
		if (!value) {
			return null;
		}
		const config = ConfigFile.fromJSON(value);
		return config;
	}

	static async fromApi(url: string): Promise<ConfigFile | null> {
		return null;
	}

	static async fromLocalCache(): Promise<ConfigFile | null> {
		const varDir = await getUserCacheDir();
		if (varDir === null) {
			return null;
		}
		const varfile = Path.join(varDir, 'knut', 'config.yaml');
		const varfileContents = await readFile(varfile, 'utf-8');
		const varfileData = YAML.parse(varfileContents) as ConfigDefinition;
		return new ConfigFile(varfileData);
	}

	static async fromCurrentUser(): Promise<ConfigFile | null> {
		const configDir = await getUserConfigDir();
		if (configDir === null) {
			return null;
		}
		const configfile = Path.join(configDir, 'knut', 'config.yaml');
		const configfileContent = await readFile(configfile, 'utf-8');
		return ConfigFile.fromYAML(configfileContent);
	}

	static async fromJSON(json: string): Promise<ConfigFile | null> {
		const value = JSON.parse(json) as ConfigDefinition;
		const config = new ConfigFile(value);
		return config;
	}

	static async fromYAML(yaml: string): Promise<ConfigFile | null> {
		const data = YAML.parse(yaml) as ConfigDefinition;
		return new ConfigFile(data);
	}

	private constructor(private data: ConfigDefinition) {}

	createId(): string {
		return createId({ count: 5 });
	}

	updateKegConfig(definition: KegConfigDefinition) {
		const index = this.data.kegs.findIndex(
			(a) => a.alias === definition.alias,
		);
		if (index >= 0) {
			this.data.kegs[index] = definition;
		} else {
			this.data.kegs.push(definition);
		}
	}

	deleteKeg(kegalias: string) {
		this.data.kegs = this.data.kegs.filter((a) => a.alias !== kegalias);
	}

	toYAML(): string {
		return YAML.stringify(this.data);
	}

	toJSON() {
		return JSON.stringify(this.data);
	}

	concat(other: ConfigFile): ConfigFile {
		const config = this.clone();
		for (const keg of other.data.kegs) {
			config.updateKegConfig(keg);
		}
		return config;
	}

	clone(): ConfigFile {
		const definition: ConfigDefinition = {
			version: this.data.version ?? 'draft-0.1',
			kegs: [],
		};
		for (const def of this.data.kegs) {
			definition.kegs.push({ ...def });
		}
		const config = new ConfigFile(definition);
		return config;
	}

	stringify() {
		return this.toYAML();
	}
}

export class KnutConfig {
	constructor(private data: { var: ConfigFile; config: ConfigFile }) {}

	/**
	 * Merged configuration
	 **/
	getConfig(): ConfigFile {
		return this.data.var.concat(this.data.config);
	}

	get config(): ConfigFile {
		return this.data.config;
	}

	get var(): ConfigFile {
		return this.data.var;
	}
}
