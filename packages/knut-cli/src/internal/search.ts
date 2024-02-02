import { Knut, SearchStrategy } from '@jlrickert/knutjs-core/knut';

type SearchOptions = {
	pager?: boolean;
	tags?: string[];
	strategy?: SearchStrategy;
	kegpaths: string[];
	json?: boolean;
	yaml?: boolean;
	raw?: boolean;
	limit?: number;
};

export const search = async (query: string, options: SearchOptions) => {
	const knut = await Knut.create();
	const results = await knut.search({
		limit: options.limit,
		filter: {
			$text: { $search: query },
			content: { $query: query },
			tags: options.tags,
		},
	});

	results.sort((a, b) => {
		return b.rank - a.rank;
	});

	if (options.raw) {
		console.log(JSON.stringify(results));
	} else {
		console.log(results);
	}
};
