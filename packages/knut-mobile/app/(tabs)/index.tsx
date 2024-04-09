import React from 'react';
import { View, Text } from 'react-native';
import { useKnut } from '../../src/store';

export default function Tab() {
	const knut = useKnut();
	return (
		<View
			style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}
		>
			<Text>Tab home</Text>
		</View>
	);
}
