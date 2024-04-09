import { Stack } from 'expo-router/stack';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Index() {
	return (
		<View>
			<Stack.Screen
				options={{
					title: 'Knut',
					headerTitle: () => <Text>Knut</Text>,
				}}
			/>
			<Text>Index</Text>
		</View>
	);
}
