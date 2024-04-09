import React from 'react';
import { TextInput } from 'react-native';

export type SearchProps = {};
export default function Search(props: SearchProps) {
	const [search, setSearch] = React.useState('');
	return (
		<TextInput
			value={search}
			onChangeText={(text) => {
				setSearch(text);
			}}
			placeholder="Search"
		/>
	);
}
