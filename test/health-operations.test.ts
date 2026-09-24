import { describe, expect, it } from 'vitest';

import { BASE_URL, createExecuteContext, node } from './helpers/mock-context';

describe('Health › Ping', () => {
	it('wraps the plain-text answer in an item', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'health', operation: 'ping' },
			respond: () => 'Pong!',
		});

		const [output] = await node.execute.call(context);

		expect(requests[0].url).toBe(`${BASE_URL}/ping`);
		expect(output).toEqual([{ json: { message: 'Pong!' }, pairedItem: { item: 0 } }]);
	});
});
