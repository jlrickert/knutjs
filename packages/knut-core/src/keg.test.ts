import { describe, expect, it } from 'vitest';
import { TestContext } from './internal/testUtils.js';
import { Keg } from './keg.js';
import { KegStorage } from './kegStorage.js';
import { stringify } from './utils.js';
import invariant from 'tiny-invariant';
import { optional } from './internal/optional.js';
import { KegNode, NodeId } from './node.js';

describe('keg', async () => {
	it('should be able to create a new keg', async () => {
		const context = await TestContext.nodeContext();
		const env = await context.getEnv();
		const storage = KegStorage.fromStorage(context.root.child('testkeg'));
		const keg = await Keg.init(storage);
		invariant(optional.isSome(keg));

		const kegFileContent = await storage.read('keg');
		expect(kegFileContent).toEqual(stringify(keg?.kegFile));

		const node = await keg.getNode(new NodeId(0));
		const zeroNode = await KegNode.zeroNode();
		expect(node?.content).toEqual(zeroNode.content);
	});
});
