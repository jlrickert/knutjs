/** @type {import('jest').Config} */
const config = {
	preset: 'jest-expo',
	displayName: 'knut',
	setupFilesAfterEnv: ['./setup-jest.ts'],
	collectCoverage: false,
	collectCoverageFrom: [
		'**/*.{js,jsx}',
		'!**/coverage/**',
		'!**/node_modules/**',
		'!**/babel.config.js',
		'!**/jest.setup.js',
	],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
	},
	transformIgnorePatterns: [
		'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
	],
};

module.exports = config;
