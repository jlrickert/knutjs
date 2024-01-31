import { Keg } from '../keg.js';
import { Knut } from '../knut.js';
import { EnvStorage } from '../envStorage.js';

export type IndexPlugin = {
	name: string;
	update?: () => Promise<void>;
	reload?: () => Promise<void>;
};

export type IndexPluginContext = {
	keg: Keg;
	kegalias?: string;
	knut?: Knut;
	storage?: EnvStorage;
};

export type IndexPluginCreator = (
	ctx: IndexPluginContext,
) => Promise<IndexPlugin>;
