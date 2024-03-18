import { KnutCommand } from '../knut.js';

export const configCli = KnutCommand('config').option(
	'--setKeg <kegalias> <key> <value>',
	'Modify a config for a given keg keg',
);
