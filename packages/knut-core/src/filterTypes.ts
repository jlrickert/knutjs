export type Filter<TSchema> = {
	[P in keyof TSchema]?: Condition<TSchema[P]>;
} & RootFilterOperators<TSchema>;

export type Condition<T> =
	| AlternativeType<T>
	| FilterOperators<AlternativeType<T>>;

export type RegExpOrString<T> = T extends string ? RegExp | T : T;

export type AlternativeType<T> = T extends ReadonlyArray<infer U>
	? T | RegExpOrString<U>
	: RegExpOrString<T>;

export type FilterOperators<TValue> = {
	// Comparison
	$eq?: TValue;
	$gt?: TValue;
	$gte?: TValue;
	$in?: ReadonlyArray<TValue>;
	$lt?: TValue;
	$lte?: TValue;
	$ne?: TValue;
	$nin?: ReadonlyArray<TValue>;
	// Logical
	$not?: TValue extends string
		? FilterOperators<TValue> | RegExp
		: FilterOperators<TValue>;
	// Element
	/**
	 * When `true`, `$exists` matches the documents that contain the field,
	 * including documents where the field value is null.
	 */
	$exists?: boolean;
	// Evaluation
	$expr?: Record<string, any>;
	$jsonSchema?: Record<string, any>;
	$mod?: TValue extends number ? [number, number] : never;
	$regex?: TValue extends string ? RegExp | string : never;
	$options?: TValue extends string ? string : never;
	// Array
	$all?: ReadonlyArray<any>;
	$elemMatch?: Document;
	$size?: TValue extends ReadonlyArray<any> ? number : never;
	// Searching
	$query?: string;
};

export type RootFilterOperators<TSchema> = {
	$and?: Filter<TSchema>[];
	$nor?: Filter<TSchema>[];
	$or?: Filter<TSchema>[];
	$text?: {
		$search: string;
		$language?: string;
		$caseSensitive?: boolean;
		$diacriticSensitive?: boolean;
	};
	$where?: string | ((this: TSchema) => boolean);
	$comment?: string | Document;
};

export const buildFilterFn = <T>(filter: Filter<T> | Condition<T>) => {
	return (data: T): boolean => {
		if (
			typeof filter === 'string' ||
			typeof filter === 'number' ||
			Array.isArray(filter)
		) {
			return true;
		}
		for (const key in filter) {
			if (filter.hasOwnProperty(key)) {
				const k = key as keyof Filter<T>;
				const element = filter[k];
				switch (k) {
					case '$or': {
						return (element as Filter<T>[]).reduce((acc, f) => {
							if (acc) {
								return true;
							}
							return buildFilterFn(f)(data);
						}, false);
					}
					case '$and': {
						return (element as Filter<T>[]).reduce((acc, f) => {
							if (!acc) {
								return false;
							}
							return buildFilterFn(f)(data);
						}, true);
					}
					case '$nor': {
						const result = (element as Filter<T>[]).reduce(
							(acc, f) => {
								if (acc) {
									return true;
								}
								return buildFilterFn(f)(data);
							},
							false,
						);
						return !result;
					}
					case '$text': {
						return true;
					}
					case '$where': {
						return true;
					}
					case '$comment': {
						return true;
					}

					default: {
						element;
					}
				}
			}
		}
		return true;
	};
};
