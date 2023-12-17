export { Config } from './config';
export { Dex } from './dex';
export { Knut } from './knut';
export { Node } from './node';

// const log = (cmd: string): void => {
// 	console.log(`Running "${cmd}"`);
// };
//
// export const findKegpath = (): string | null => {
// 	return null;
// };
//
// export const index = (): void => {
// 	log('index');
// };
//
// export const create = (template?: string): void => {
// 	if (template) {
// 		log(`create ${template}`);
// 		return;
// 	}
//
// 	log('create');
// };
//
// export type Config = {};
//
// export const config = (): Config => {
// 	return {};
// };
//
// export const edit = (index: string): void => {
// 	log(`edit ${index}`);
// };
//
// export type SearchMethod = 'classic' | 'semantic';
// export type SearchOptions = {
// 	interactive?: boolean;
// 	model?: SearchMethod;
// };
// export const search = (query: string, options?: SearchOptions): string[] => {
// 	log(`search ${query}`);
// 	return [];
// };
