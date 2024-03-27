import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';

export default function Root() {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>
				Open up App.js to start working on your app!
			</Text>
			<StatusBar style="auto" />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000000',
		alignItems: 'center',
		justifyContent: 'center',
	},
	text: {
		color: '#ffffff',
	},
});
