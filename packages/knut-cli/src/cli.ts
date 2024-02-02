import { configCli } from './configCli.js';
import { knutCli } from './knutCli.js';
import { kegCli } from './kegCli.js';
import { searchCli } from './searchCli.js';
import { shareCli } from './shareCli.js';
import { updateCli } from './updateCli.js';

knutCli.addCommand(searchCli);
knutCli.addCommand(kegCli);
knutCli.addCommand(shareCli);
knutCli.addCommand(configCli);
knutCli.addCommand(updateCli);

export { knutCli };
