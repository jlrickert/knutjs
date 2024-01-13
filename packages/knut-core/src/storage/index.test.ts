import * as Path from 'path';
import { readFile } from 'fs/promises';
import { describe, expect, test } from 'vitest';
import invariant from 'tiny-invariant';
import { SystemStorage } from './index.js';
import { sampleKegpath } from '../internal/testUtils.js';
import { NodeContent } from '../nodeContent.js';
import { NodeId } from '../node.js';

describe('system storage for a node environment', () => {
	test('should be able to find the nearest keg', async () => {
		const kegfile = await SystemStorage.findNearestKegpath();
		expect(kegfile).toBe(sampleKegpath);
	});

	test('should be able to read data', async () => {
		const storage = await SystemStorage.findNearest();
		invariant(storage !== null, 'Expect to be true');
		const md = await storage.read('0/README.md');
		const content = await readFile(
			Path.join(sampleKegpath, NodeContent.filePath(new NodeId('0'))),
		);
		expect(md).toEqual(content.toString());
	});
});
