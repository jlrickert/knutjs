/** @type {import('jest').Config} */
const config = {
	preset: 'jest-expo',
	setupFilesAfterEnv: ['./setup-jest.ts'],
	collectCoverage: false,
	collectCoverageFrom: [
		'**/*.{js,jsx}',
		'!**/coverage/**',
		'!**/node_modules/**',
		'!**/babel.config.js',
		'!**/jest.setup.js',
	],
	transformIgnorePatterns: [
		'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
	],
};

module.exports = config;
