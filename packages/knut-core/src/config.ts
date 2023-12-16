import { NodeId } from './node';
import { createId } from './utils';

export class Config {
	static load(kegpath: string): Config | null {
		return null;
	}

	private constructor() {}

	createId(): NodeId {
		return createId({ count: 5 });
	}
}
