import { Command, Option } from 'commander';

export type KegAliasOption = { aliases?: string[] };
export const kegaliasOption = new Option(
	'-a, --alias <alias...>',
	'Kegs to use',
);

export const parseKegPath = (value: string): string[] => {
	return value.split(',').map((a) => a.trim());
};

export type KnutConfigOption = {
	config?: string;
};
export const configOption = new Option('-c, --config <config>');

export type JSONOption = { json?: boolean };
export const jsonOption = new Option('--json', 'Output as json').conflicts(
	'yaml',
);

export type YAMLOption = { yaml?: boolean };
export const yamlOption = new Option('--yaml', 'Output as yaml').conflicts(
	'json',
);

export type RawOption = { raw?: boolean };
export const rawOption = new Option(
	'-r, --raw',
	'outputs minified json to be piped in jq',
).implies({ json: true });

/**
 * Create a keg command. This add
 */
export const KnutCommand = (name: string): Command => {
	return new Command(name)
		.enablePositionalOptions(true)
		.addOption(kegaliasOption)
		.addOption(configOption);
};
