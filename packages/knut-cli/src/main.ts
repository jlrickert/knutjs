#!/usr/bin/env node

import { detectBackend } from './backend.js';
import { rootCli } from './root.js';

const backend = await detectBackend();
rootCli(backend).parse(process.argv);
