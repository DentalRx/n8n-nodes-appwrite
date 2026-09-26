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

describe('Health › Get Certificate', () => {
	it('sends the domain, which Appwrite requires', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'health', operation: 'getCertificate', domain: ' example.com ' },
			respond: () => ({ name: 'example.com', status: 'pass' }),
		});

		await node.execute.call(context);

		expect(requests[0].url).toBe(`${BASE_URL}/health/certificate`);
		expect(requests[0].qs).toEqual({ domain: 'example.com' });
	});

	it('stops before the request when the domain is empty', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'health', operation: 'getCertificate', domain: '' },
		});

		await expect(node.execute.call(context)).rejects.toThrow(
			'Enter the domain whose certificate to check',
		);
		expect(requests).toHaveLength(0);
	});
});
