import invariant from 'tiny-invariant';
import { Future } from '../internal/index.js';
import { NodeId } from '../KegNode.js';
import { Keg } from '../keg.js';
import { KegConfig } from '../KegConfig.js';

type KegPluginContext<T = {}> = T & {
	keg: Keg;
};

export type KegEventHandlers = {
	/**
	 * Runs after a new keg is initiated
	 */
	onNewKeg: (
		context: KegPluginContext,
		next: () => Future.Future<void>,
	) => Future.Future<void>;

	/**
	 * Runs when a keg is first initiated. This always gets called. Only gets
	 * called once.  If you only want  By default, this enables the addon.
	 */
	onInit: (
		context: KegPluginContext<{ enabled: boolean }>,
		next: () => Future.Future<void>,
	) => Future.Future<void>;

	/**
	 * runs every time a keg runs update
	 */
	onUpdate: (
		context: KegPluginContext,
		next: () => Future.Future<void>,
	) => Future.Future<void>;

	/**
	 * runs every time a new node is created
	 */
	onNodeCreate: (
		context: KegPluginContext<{ nodeId: NodeId }>,
		next: () => Future.Future<void>,
	) => Future.Future<void>;

	/**
	 * Runs every time a node is written too
	 */
	onNodeWrite: (
		context: KegPluginContext<{ nodeId: NodeId }>,
		next: () => Future.Future<void>,
	) => Future.Future<void>;

	/**
	 * Runs everytime a node is read
	 */
	onNodeRead: (
		context: KegPluginContext<{ nodeId: NodeId }>,
		next: () => Future.Future<void>,
	) => Future.Future<void>;

	/**
	 * Runs every time a node is deleted
	 */
	onNodeDelete(
		context: KegPluginContext<{ nodeId: NodeId }>,
		next: () => Future.Future<void>,
	): Future.Future<void>;

	/**
	 * Runs every time configuration is reloaded. Keg.config will have an up to
	 * date reference
	 */
	onConfigReload: (
		context: KegPluginContext<{ config: KegConfig; nodeId: NodeId }>,
		next: () => Future.Future<void>,
	) => Future.Future<void>;

	/**
	 * Runs when a plugin is enabled.
	 */
	onEnable: (
		context: KegPluginContext,
		next: () => Future.Future<void>,
	) => Future.Future<void>;

	/**
	 * Runs when a plugin is disabled
	 */
	onDisable: (
		context: KegPluginContext,
		next: () => Future.Future<void>,
	) => Future.Future<void>;
};

export type KegPlugin = KegEventHandlers;

/**
 * Creates a keg plugin with some basic behavior added in.
 *
 * - Auto calls next handler
 */
export const createKegPlugin = (
	fn?: (() => Partial<KegEventHandlers>) | Partial<KegEventHandlers>,
): KegPlugin => {
	const handlers = typeof fn === 'function' ? fn() : fn;
	return {
		onInit: async (context, next) => {
			if (!handlers?.onInit) {
				return next();
			}
			let called = false;
			await handlers.onInit(context, async () => {
				await next();
				called = true;
			});
			if (!called) {
				await next();
			}
		},
		onNewKeg: async (context, next) => {
			if (!handlers?.onNewKeg) {
				return next();
			}
			let called = false;
			await handlers.onNewKeg(context, async () => {
				await next();
				called = true;
			});
		},
		onEnable: async (context, next) => {
			if (!handlers?.onEnable) {
				return next();
			}
			let called = false;
			await handlers.onEnable(context, async () => {
				await next();
				called = true;
			});
		},
		onDisable: async (context, next) => {
			if (!handlers?.onDisable) {
				return next();
			}
			let called = false;
			await handlers.onDisable(context, async () => {
				await next();
				called = true;
			});
		},
		onUpdate: async (context, next) => {
			if (!handlers?.onUpdate) {
				return next();
			}
			let called = false;
			await handlers.onUpdate(context, async () => {
				await next();
				called = true;
			});
		},
		onNodeDelete: async (context, next) => {
			if (!handlers?.onNodeDelete) {
				return next();
			}
			let called = false;
			await handlers.onNodeDelete(context, async () => {
				await next();
				called = true;
			});
		},
		onNodeRead: async (context, next) => {
			if (!handlers?.onNodeRead) {
				return next();
			}
			let called = false;
			await handlers.onNodeRead(context, async () => {
				await next();
				called = true;
			});
		},
		onNodeWrite: async (context, next) => {
			if (!handlers?.onNodeWrite) {
				return next();
			}
			let called = false;
			await handlers.onNodeWrite(context, async () => {
				await next();
				called = true;
			});
		},
		onNodeCreate: async (context, next) => {
			if (!handlers?.onNodeCreate) {
				return next();
			}
			let called = false;
			await handlers.onNodeCreate(context, async () => {
				await next();
				called = true;
			});
		},
		onConfigReload: async (context, next) => {
			if (!handlers?.onConfigReload) {
				return next();
			}
			let called = false;
			await handlers.onConfigReload(context, async () => {
				await next();
				called = true;
			});
		},
	};
};

// export class KegPlugin {
// 	private _enabled = false;
//
// 	private handlers: KegEventHandlers;
// 	public keg!: Keg;
// 	public name: string;
// 	constructor(name: string, handlers: () => Partial<KegEventHandlers>) {
// 		this.name = name;
// 		this.handlers = {
// 			...defaultHandlers,
// 			...handlers(),
// 		};
// 	}
//
// 	private getKeg(): Keg {
// 		invariant(this.keg, `Plugin ${this.name} must be initialized`);
// 		return this.keg;
// 	}
//
// 	public isEnabled() {
// 		return this._enabled;
// 	}
//
// 	public isDisabled() {
// 		return !this._enabled;
// 	}
//
// 	/**
// 	 * init will initialize the plugin and enable it
// 	 */
// 	public async init(
// 		keg: Keg,
// 		next: () => Future.Future<void>,
// 	): Future.Future<void> {
// 		await this.enable(keg, next);
// 		if (this.isDisabled()) {
// 			return;
// 		}
// 		this.keg = keg;
// 		await this.handlers.onInit(this.getKeg(), next);
// 	}
//
// 	async newKeg(next: () => Future.Future<void>): Future.Future<void> {
// 		if (this.isDisabled()) {
// 			return;
// 		}
// 		let called = false;
// 		await this.handlers.onNewKeg(this.getKeg(), async () => {
// 			await next();
// 			called = true;
// 		});
// 		if (!called) {
// 			await next();
// 		}
// 	}
//
// 	/**
// 	 * Enable the addon
// 	 */
// 	public async enable(next: () => Future.Future<void>): Future.Future<void> {
// 		let called = false;
// 		await this.setEnabled(true, this.getKeg(), async () => {
// 			await next();
// 			called = true;
// 		});
// 		if (!called) {
// 			await next();
// 		}
// 	}
//
// 	/**
// 	 * disable disables the addon. This will prevent any of its functions from
// 	 * running when
// 	 */
// 	public async disable(next: () => Future.Future<void>): Future.Future<void> {
// 		let called = false;
// 		await this.setEnabled(false, this.getKeg(), async () => {
// 			await next();
// 			called = true;
// 		});
// 		if (!called) {
// 			await next();
// 		}
// 	}
//
// 	/**
// 	 * update is called when a keg runs `update`. A keg's dex is updated before
// 	 * this call
// 	 */
// 	async update(next: () => Future.Future<void>): Future.Future<void> {
// 		if (this.isDisabled()) {
// 			return;
// 		}
// 		let called = false;
// 		await this.handlers.onUpdate(this.getKeg(), async () => {
// 			await next();
// 			called = true;
// 		});
// 		if (!called) {
// 			await next();
// 		}
// 	}
//
// 	async createNode(
// 		nodeId: NodeId,
// 		services: Services,
//
// 		next: () => Future.Future<void>,
// 	): Future.Future<void> {
// 		if (this.isDisabled()) {
// 			return;
// 		}
// 		await this.handlers.onNodeCreate(nodeId, this.getKeg(services), next);
// 	}
//
// 	async readNode(
// 		nodeId: NodeId,
// 		services: Services,
// 		next: () => Future.Future<void>,
// 	): Future.Future<void> {
// 		if (this.isDisabled()) {
// 			return;
// 		}
// 		await this.handlers.onNodeRead(nodeId, this.getKeg(services), next);
// 	}
//
// 	async writeNode(
// 		nodeId: NodeId,
// 		services: Services,
// 		next: () => Future.Future<void>,
// 	): Future.Future<void> {
// 		if (this.isDisabled()) {
// 			return;
// 		}
// 		await this.handlers.onNodeWrite(nodeId, this.getKeg(services), next);
// 	}
//
// 	async deleteNode(
// 		nodeId: NodeId,
// 		services: Services,
// 		next: () => Future.Future<void>,
// 	): Future.Future<void> {
// 		if (this.isDisabled()) {
// 			return;
// 		}
// 		await this.handlers.onNodeDelete(nodeId, this.getKeg(services), next);
// 	}
//
// 	async reloadConfig(
// 		context:
// 			next: () => Future.Future<void>,
// 	): Promise < void> {
// 	if(this.isDisabled()) {
// 	return;
// }
// await this.handlers.onConfigReload(this.getKeg(), next);
// 	}
//
// 	//
// 	// Private handlers
// 	//
//
// 	private async setEnabled(
// 	enabled: boolean,
// 	services: Services,
// 	next: () => Future.Future<void>,
// ): Future.Future < void> {
// 	if(this._enabled === enabled) {
// 	return;
// }
// this._enabled = enabled;
// if (this._enabled) {
// 	await this.handlers.onEnable(this, next);
// } else {
// 	await this.handlers.onDisable(this, next);
// }
// 	}
// }
