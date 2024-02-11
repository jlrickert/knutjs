export type UpdateFn = () => Promise<void>;

export type IndexPlugin = {
	name: string;
	summary?: string;
	depends?: string[];
	update: UpdateFn;
};
