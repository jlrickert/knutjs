import { configCli } from './subcommands/configCli.js';
import { knutCli } from './subcommands/knutCli.js';
import { kegCli } from './subcommands/kegCli.js';
import { searchCli } from './subcommands/searchCli.js';
import { shareCli } from './subcommands/shareCli.js';
import { updateCli } from './subcommands/updateCli.js';

knutCli.addCommand(searchCli);
knutCli.addCommand(kegCli);
knutCli.addCommand(shareCli);
knutCli.addCommand(configCli);
knutCli.addCommand(updateCli);

export { knutCli };
