import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: 'blue',
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Home',
					tabBarIcon: ({ color }) => (
						<FontAwesome size={28} name="home" color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="indexes"
				options={{
					title: 'Indexes',
					tabBarIcon: ({ color }) => (
						<FontAwesome size={28} name="info" color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="search"
				options={{
					title: 'search',
					tabBarIcon: ({ color }) => (
						<FontAwesome size={28} name="search" color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="create"
				options={{
					title: 'Create',
					tabBarIcon: ({ color }) => (
						<FontAwesome size={28} name="plus" color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
