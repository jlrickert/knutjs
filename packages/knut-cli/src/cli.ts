import { configCli } from './subCommands/configCli.js';
import { knutCli } from './subCommands/knutCli.js';
import { kegCli } from './subCommands/kegCli.js';
import { searchCli } from './subCommands/searchCli.js';
import { shareCli } from './subCommands/shareCli.js';
import { updateCli } from './subCommands/updateCli.js';
import { detectBackend } from './backend.js';

const backend = await detectBackend();

knutCli.addCommand(searchCli(backend));
knutCli.addCommand(kegCli);
knutCli.addCommand(shareCli);
knutCli.addCommand(configCli);
knutCli.addCommand(updateCli);

export { knutCli };
