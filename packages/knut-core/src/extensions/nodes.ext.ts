import { Extension } from '../extension.js';
import { Future } from '../internal/future.js';
import { optional } from '../internal/optional.js';
import { Keg } from '../keg.js';
import { Knut } from '../knut.js';

export class NodesExtension extends Extension {
	name = 'nodes';
	depends: string[] = [];

	constructor() {
		super();
	}

	async activate(): Future<void> {
		this.onAction('init', async ({ knut }) => {});

		this.onAction('initKeg', async ({ keg }) => {});

		this.onAction('update', async ({ keg }) => {
			await this.updateKeg(keg);
		});
		this.onAction('updateAll', async ({ knut }) => {
			await this.updateAll(knut);
		});

		this.onAction('nodeCreate', async ({}) => {
			return;
		});
		this.onAction('nodeDelete', async () => {
			return;
		});
		this.onAction('nodeUpdate', async ({}) => {
			return optional.none;
		});
	}

	async getOptions(keg: Keg) {}

	async createOrGetNodes(keg: Keg): Future<string> {
		keg.storage.read('');
		return '';
	}

	async updateAll(knut: Knut) {
		for await (const [alias, keg] of knut.getKegList()) {
			await this.updateKeg(keg);
		}
	}

	async updateKeg(keg: Keg) {
		keg.dex.clear();
		for await (const nodeId of keg.storage.listNodes()) {
			const node = await keg.getNode(nodeId);
			if (optional.isNone(node)) {
				continue;
			}
		}
	}
}
