import React from 'react';
import { Stack } from 'expo-router/stack';
import { Text } from 'react-native';
import Search from '../src/components/Search';
import store from '../src/store';
import { memoryBackend } from '@jlrickert/knutjs-core/dist/backend';
import { importCore } from '../src/mod';

export default function AppLayout() {
	const [knut, setKnut] = store.use('knut');
	React.useEffect(() => {
		const f = async () => {
			const { backend, Knut } = await importCore();
			const knut = await Knut.fromBackend(await backend.memoryBackend());
			setKnut(knut);
		};
		f();
		console.log('rendering');
	}, [setKnut]);
	if (knut === null) {
		return <Text>Loading ...</Text>;
	}
	return (
		<>
			<Search />
			<Stack>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			</Stack>
		</>
	);
}
