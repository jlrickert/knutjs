import { describe, expect, test } from 'vitest';
import { Markdown } from './markdown';

describe('title parsing in markdown file', () => {
	const table: Array<{
		input: string;
		expected: string;
	}> = [
		{
			input: '# Simple header',
			expected: 'Simple header',
		},
		{
			input: '# Title with [link](../0)',
			expected: 'Title with [link](../0)',
		},
		{
			input: '# Title with **emphasis**',
			expected: 'Title with **emphasis**',
		},
	];

	for (const { input, expected } of table) {
		test(`should be able to parse title ${expected} from ${input}`, () => {
			const tree = Markdown.parse(input);
			const actual = tree.getTitle();
			expect(actual).toBe(expected);
		});
	}
});
