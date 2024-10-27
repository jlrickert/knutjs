import invariant from 'tiny-invariant';
import { Future, Result } from '../Utils/index.js';
import { Path } from '../Data/index.js';
import { KnutErrorScope, KnutErrorScopeMap } from '../Data/KnutError.js';

export type StoreResult<
	T,
	E extends KnutErrorScope = 'STORAGE',
> = Future.FutureResult<T, KnutErrorScopeMap[E]>;

export type StoreNodeTime = {
	/**
	 * modified time
	 */
	mtime?: Date;

	/**
	 * last accessed time. This is when a file or directory was last read
	 */
	atime?: Date;

	/**
	 * changed time. This is when metadata is changed
	 */
	ctime?: Date;

	/**
	 * birth time. Time when the file was last created
	 */
	btime?: Date;
};

export interface StoreTypeMap {
	CUSTOM: 'custom';
}

export type StoreType = keyof StoreTypeMap;

export type StoreNodeStats = StoreNodeTime & {
	isDirectory(): boolean;
	isFile(): boolean;
};

export type Store = Readonly<{
	storageType: StoreType;
	pwd: string;
	uri: string;
	read: (path: string) => StoreResult<string>;
	write: (
		path: string,
		content: string,
		options?: { recurive: boolean },
	) => StoreResult<true>;
	rm: (path: string, options?: { recursive?: boolean }) => StoreResult<true>;
	readdir: (
		path: string,
		options?: { relative?: boolean },
	) => StoreResult<string[]>;

	mkdir: (
		path: string,
		options?: { recursive?: boolean },
	) => StoreResult<true>;
	rmdir: (
		path: string,
		options?: { recusive?: boolean },
	) => StoreResult<Boolean>;

	stats: (path: string) => StoreResult<StoreNodeStats>;
	utime: (path: string, stats: StoreNodeTime) => StoreResult<true>;

	child: (path: string) => Store;
}>;

/**
 * Holds context about the store such as current working directory
 */
export type StoreContext = {
	pwd: string;
};
export type StoreFactory = (
	factory: (context: StoreContext) => Omit<Store, 'child' | 'pwd'>,
	args: {
		pwd?: string;
	},
) => Store;
export function make(
	factory: (context: StoreContext) => Omit<Store, 'child' | 'pwd'>,
	options?: { pwd?: string },
): Store {
	const wrap = (store: Omit<Store, 'child'>): Store => {
		const { uri, pwd, ...s } = store;
		return {
			uri,
			pwd,
			...s,
			child: (path) => {
				const pwd = Path.resolve(store.pwd, path);
				const context: StoreContext = {
					pwd,
				};
				const { uri, ...s } = factory(context);
				return wrap({
					uri,
					pwd,
					...s,
				});
			},
		};
	};
	const pwd = options?.pwd ?? '/';
	const context: StoreContext = { pwd };
	const rootStore = factory(context);
	return wrap({ pwd, ...rootStore });
}

/**
 * copy over all contents from the source to the destination.
 */
export async function overwrite(args: {
	source: Store;
	target: Store;
}): Future.Future<void> {
	const { source, target } = args;
	const pathList = await source.readdir('');
	if (Result.isErr(pathList)) {
		return;
	}
	for (const path of pathList.value) {
		const stats = await source.stats(path);
		invariant(
			Result.isOk(stats),
			'Expect readdir to only list items that exist',
		);
		if (stats.value.isDirectory()) {
			await target.mkdir(path);
			await overwrite({
				source: source.child(path),
				target: target.child(path),
			});
		} else if (stats.value.isFile()) {
			const content = await source.read(path);
			invariant(
				Result.isOk(content),
				'Expect readdir to list a valid file',
			);
			await target.write(path, content.value);
		} else {
			throw new Error('Unhandled node type');
		}
	}
}

export async function listNodes(storage: Store) {
	const dirList = Result.map(await storage.readdir(''), (list) =>
		list.reduce((acc, item) => {
			if (Number.isInteger(item)) {
				acc.push(Number.parseInt(item));
			}
			return acc;
		}, [] as number[]),
	);
	return dirList;
}
