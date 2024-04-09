import { Stack } from 'expo-router/stack';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import store from '../../src/store';
import { importCore } from '../../src/mod';

export default function Index() {
	const [knut, setKnut] = store.use('knut');
	React.useEffect(() => {
		const f = async () => {
			const { Knut, backend } = await importCore();
			const b = await backend.memoryBackend();
			const k = await Knut.fromBackend(b);
			await k.initKeg('main', 'kegs/main');
			setKnut(k);
		};
		f();
	}, [setKnut]);
	return (
		<View>
			{knut === null ? (
				<Text>Loading...</Text>
			) : (
				<>
					<Stack.Screen
						options={{
							title: 'Knut',
							headerTitle: ({ children }) => (
								<Text>Knut - {children}</Text>
							),
						}}
					/>
					<Text>keg</Text>
				</>
			)}
		</View>
	);
}
