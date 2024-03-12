import { describe, expect, it } from 'vitest';
import invariant from 'tiny-invariant';
import { testUtils } from './internal/testUtils.js';
import { optional } from './internal/optional.js';
import { Keg } from './keg.js';
import { stringify } from './utils.js';
import { KegNode, NodeId } from './node.js';

describe('keg', async () => {
	it('should be able to create a new keg', async () => {
		const backend = await testUtils.testNodeBackend();
		const storage = await backend.loader('testkeg');
		invariant(
			optional.isSome(storage),
			'Expect test backend to load as expected',
		);
		const keg = await Keg.init(storage);
		invariant(optional.isSome(keg));

		const kegFileContent = await storage.read('keg');
		expect(kegFileContent).toEqual(stringify(keg?.kegFile));

		const node = await keg.getNode(new NodeId(0));
		const zeroNode = await KegNode.zeroNode();
		expect(node?.content).toEqual(zeroNode.content);
	});
});
