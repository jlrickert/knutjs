import { absurd } from "fp-ts/lib/function.js";

export type Stringer =
	| string
	| {
			stringify: () => string;
	  };

export const stringify = (value: number | Date | Stringer): string => {
	if (typeof value === 'string') {
		return value;
	} else if (typeof value === 'number') {
		return String(value);
	} else if (value instanceof Date) {
		return value.toISOString();
	} else if ('stringify' in value) {
		return value.stringify();
	}
	return absurd(value);
};
