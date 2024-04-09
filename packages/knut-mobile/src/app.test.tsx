import React from 'react';
import { renderRouter, screen } from 'expo-router/testing-library';
import renderer from 'react-test-renderer';

import { View } from 'react-native';

// declare global {
// 	namespace jest {
// 		interface Matchers<R> {
// 			toHavePathname(expected)
// 		}
// 	}
// }

it('my-test', async () => {
	const MockComponent = jest.fn(() => <View />);

	renderRouter(
		{
			index: MockComponent,
			'directory/a': MockComponent,
			'(group)/b': MockComponent,
		},
		{
			initialUrl: '/directory/a',
		},
	);

	// expect(screen).toHavePathname('/directory/a');
});

import Root from './Root';

describe('<Root />', () => {
	it('has 1 child', () => {
		const tree = renderer.create(<Root />).toJSON()!;
		if (Array.isArray(tree)) {
			throw new Error('asdf');
		}
		expect(tree.children?.length).toBe(1);
	});
});
