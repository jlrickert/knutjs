import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestUtils } from '../internal/testUtils';
import { KegEventHandlers, KegPlugin, createKegPlugin } from './KegPlugin';
import { Keg } from '../keg';

const ExamplePlugin = () => {
	let called: Record<keyof KegEventHandlers, number> = {
		onInit: 0,
		onConfigReload: 0,
		onNodeCreate: 0,
		onNodeWrite: 0,
		onNodeRead: 0,
		onUpdate: 0,
		onNodeDelete: 0,
		onNewKeg: 0,
		onEnable: 0,
		onDisable: 0,
	};
	return {
		called,
		...createKegPlugin({
			onInit: async () => {
				called.onInit += 1;
			},
			onConfigReload: async () => {
				called.onConfigReload += 1;
			},
			onNodeCreate: async () => {
				called.onNodeCreate += 1;
			},
			onNodeWrite: async () => {
				called.onNodeWrite += 1;
			},
			onNodeRead: async () => {
				called.onNodeRead += 1;
			},
			onUpdate: async () => {
				called.onUpdate += 1;
			},
			onNodeDelete: async () => {
				called.onNodeDelete += 1;
			},
			onNewKeg: async () => {
				called.onNewKeg += 1;
			},
			onDisable: async () => {
				called.onDisable += 1;
			},
		}),
	};
};

TestUtils.describeEachBackend('KegPlugin', async ({ name, loadBackend }) => {
	it(`${name} - should do the thing`, async () => {
		const backend = await loadBackend();

		const p1 = ExamplePlugin();
		const p2 = ExamplePlugin();
		const p3 = ExamplePlugin();

		const keg = await Keg.fromBackend({
			uri: 'example',
			backend,
			plugins: { p1: p1, p2: p2, p3: p3 },
		});
		const testCount = (key: keyof (typeof p1)['called'], count: number) => {
			expect(p1.called[key]).toEqual(count);
			expect(p2.called[key]).toEqual(count);
			expect(p3.called[key]).toEqual(count);
		};
		expect(5).toEqual(3);
		testCount('onInit', 1);
		testCount('onDisable', 0);
		testCount('onEnable', 1);
		testCount('onNewKeg', 0);
		testCount('onConfigReload', 0);

		await keg?.createNode();
		testCount('onNodeCreate', 1);
	});
});
