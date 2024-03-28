// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// #1 - Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// TODO(jared): Research why they had this option and why it didn't work for me
// An example had this included.  Not sure if there is any advantages
//
// #3 - Force resolving nested modules to the folders below
// config.resolver.disableHierarchicalLookup = true;

// #2 - Try resolving with project modules first, then workspace modules
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, 'node_modules'),
	path.resolve(workspaceRoot, 'node_modules'),
];

// Use turborepo to restore the cache when possible
config.cacheStores = [
	new FileStore({
		root: path.join(projectRoot, 'node_modules', '.cache', 'metro'),
	}),
];

module.exports = config;
