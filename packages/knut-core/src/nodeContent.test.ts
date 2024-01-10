import { describe, expect, test } from 'vitest';
import { NodeContent } from './nodeContent.js';

describe('title parsing in markdown file', async () => {
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
		test(`should be able to parse title ${expected} from ${input}`, async () => {
			const content = await NodeContent.fromMarkdown(input);
			expect(content.title).toBe(expected);
		});
	}
});
