import { describe, expect, it } from 'vitest';
import { TestContext } from './testUtils.js';

describe('testUtils.createTestNodePlatform', async () => {
	it('should have a filesystem with expected fixtures', async () => {
		const context = await TestContext.nodeContext();

		const fixture = context.fixture.readdir('');
		const root = context.root.readdir('');
		expect(fixture).toStrictEqual(root);
	});

	it('should create keg data and config data', async () => {
		const context = await TestContext.nodeContext();
		await context.popluateFixture();

		const kegFileData = await context.fixture.read('samplekeg1/keg');
		expect(kegFileData?.length).toBeGreaterThan(0);
		expect(kegFileData).toStrictEqual(
			await context.root.read('samplekeg1/keg'),
		);
	});

	it('knut should have the kegs loaded', async () => {
		const context = await TestContext.nodeContext();
		await context.popluateFixture();
		const knut = await context.getKnut();

		const testTable = [
			{
				l: (await context.getKeg('samplekeg1'))?.kegFile.data,
				r: knut.getKeg('sample1')?.kegFile.data,
			},
			{
				l: (await context.getKeg('samplekeg2'))?.kegFile.data,
				r: knut.getKeg('sample2')?.kegFile.data,
			},
			{
				l: (await context.getKeg('samplekeg3'))?.kegFile.data,
				r: knut.getKeg('sample3')?.kegFile.data,
			},
		];

		for (const { l, r } of testTable) {
			expect(l).toStrictEqual(r);
			expect(l).toBeTruthy();
		}
	});
});
