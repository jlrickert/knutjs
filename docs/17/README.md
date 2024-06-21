# Basic example of testing against knut

Typically, most tests will need a backend to test against. There is a `TestUtils` namespace that provides utilities for common things.

## Test basic keg operations

Most test will be doing stuff to a pre existing keg. Here is an example setup.

```ts
TestUtils.describeEachBackend('KegNode', async ({ loadBackend }) => {
	it('should do the thing', async () => {
		const backend = await loadBackend();

		backend.loader('');
	});
});
```

## Test things outside of a keg

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestUtils } from './internal/testUtils';

it('should do the thing', async () => {
	const backend = await loadBackend();

	backend.loader('');
});
```
