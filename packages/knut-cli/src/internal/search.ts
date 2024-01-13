import { Knut, SearchStrategy } from '@jlrickert/knutjs-core/knut';

type SearchOptions = {
	pager?: boolean;
	tags?: string[];
	strategy?: SearchStrategy;
	kegpaths: string[];
	json?: boolean;
	yaml?: boolean;
	raw?: boolean;
};

export const search = async (query: string, options: SearchOptions) => {
	const knut = new Knut();
	for (const kegpath of options.kegpaths) {
		await knut.loadKeg(kegpath, {
			storage: kegpath,
		});
	}
	const results = await knut.search({
		kegalias: options.kegpaths,
		filter: {
			$text: { $search: query },
			content: { $query: query },
			tags: options.tags,
		},
	});
	if (options.raw) {
		console.log(JSON.stringify(results));
	} else {
		console.log(results);
	}
};
