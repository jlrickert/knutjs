import { NodeId } from './node.js';
import { createId } from './utils.js';

export class Config {
	static load(kegpath: string): Config | null {
		return null;
	}

	private constructor() {}

	createId(): NodeId {
		return createId({ count: 5 });
	}
}
