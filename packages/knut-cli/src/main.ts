#!/usr/bin/env node

import { detectBackend } from './backend.js';
import { rootCli } from './root.js';

const backend = await detectBackend();
const cli = await rootCli(backend);
cli.parse(process.argv);
