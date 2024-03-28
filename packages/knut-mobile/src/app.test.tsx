import React from 'react';
// import { renderRouter, screen } from 'expo-router/testing-library';
import renderer from 'react-test-renderer';

import { View } from 'react-native';

// it('my-test', async () => {
// 	const MockComponent = jest.fn(() => <View />);
//
// 	renderRouter(
// 		{
// 			index: MockComponent,
// 			'directory/a': MockComponent,
// 			'(group)/b': MockComponent,
// 		},
// 		{
// 			initialUrl: '/directory/a',
// 		},
// 	);
//
// 	expect(screen).toHavePathname('/directory/a');
// });

import Root from './Root';

describe('<Root />', () => {
	it('has 1 child', () => {
		const tree = renderer.create(<Root />).toJSON()!;
		expect(tree.children.length).toBe(1);
	});
});
