import { share } from './index.js';
import { KnutCommand } from './knutCli.js';

export const shareCli = KnutCommand('share')
	.argument('<node_id>')
	.addHelpText('before', 'Shares a node on s3 and provides a temporary link')
	.action((nodeId, options) => {
		share(nodeId, options);
	});
