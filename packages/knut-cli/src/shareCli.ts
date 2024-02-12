import { Knut } from '@jlrickert/knutjs-core/knut.js';
import { KnutCommand } from './knutCli.js';

export const shareCli = KnutCommand('share')
	.argument('<node_id>')
	.addHelpText('before', 'Shares a node on s3 and provides a temporary link')
	.action(async (nodeId, options) => {
		const knut = await Knut.create();
		// knut.share({ nodeId, kegalias });
		// share(nodeId, options);
	});
