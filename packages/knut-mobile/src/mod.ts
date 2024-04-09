/**
 * mod.ts is a wrapper around ESM modules to make them work
 **/

export const importCore = () => import('@jlrickert/knutjs-core');
export const importUtils = () => import('@jlrickert/knutjs-core/dist/utils');
