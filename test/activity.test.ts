import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { BASE_URL, createExecuteContext, node } from './helpers/mock-context';

/** The decoded `queries[n]` parameters of a request. */
const queriesOf = (request: IHttpRequestOptions) =>
	Object.entries((request.qs ?? {}) as IDataObject)
		.filter(([key]) => key.startsWith('queries['))
		.map(([, value]) => JSON.parse(value as string) as { method: string; values?: unknown[] });

const event = (id: number): IDataObject => ({
	$id: `event-${id}`,
	event: 'users.create',
	time: '2026-09-01T00:00:00.000+00:00',
	actorType: 'user',
	actorId: 'u1',
	actorName: 'Ada',
	actorEmail: 'ada@example.com',
	resourceType: 'user',
	resourceId: 'u2',
	ip: '127.0.0.1',
	userAgent: 'curl/8',
	country: 'gb',
});

describe('Activity', () => {
	it('pages through every event by offset for Return All', async () => {
		const pages = [Array.from({ length: 100 }, (_, i) => event(i)), [event(100)]];
		const { context, requests } = createExecuteContext({
			parameters: {
				resource: 'activity',
				operation: 'getManyEvents',
				returnAll: true,
				queriesUi: {
					queryValues: [{ type: 'equal', column: 'userId', value: 'u1' }],
				},
			},
			respond: (_request, index) => ({ total: 101, events: pages[index] ?? [] }),
		});

		const [output] = await node.execute.call(context);

		expect(output).toHaveLength(101);
		expect(requests.map((request) => request.url)).toEqual([
			`${BASE_URL}/activities/events`,
			`${BASE_URL}/activities/events`,
		]);
		expect(queriesOf(requests[1])).toEqual([
			{ method: 'equal', attribute: 'userId', values: ['u1'] },
			{ method: 'limit', values: [100] },
			{ method: 'offset', values: [100] },
		]);
	});

	it('refuses a cursor query with Return All instead of paging wrongly', async () => {
		const { context, requests } = createExecuteContext({
			parameters: {
				resource: 'activity',
				operation: 'getManyEvents',
				returnAll: true,
				queriesUi: { queryValues: [{ type: 'cursorAfter', value: 'event-1' }] },
			},
		});

		await expect(node.execute.call(context)).rejects.toThrow(NodeOperationError);
		expect(requests).toHaveLength(0);
	});

	it('simplifies an event to who did what, and when', async () => {
		const { context } = createExecuteContext({
			parameters: {
				resource: 'activity',
				operation: 'getEvent',
				eventId: 'event-1',
				simplify: true,
			},
			respond: () => event(1),
		});

		const [output] = await node.execute.call(context);

		expect(Object.keys(output[0].json)).toHaveLength(10);
		expect(output[0].json).not.toHaveProperty('userAgent');
		expect(output[0].json).toMatchObject({ event: 'users.create', actorName: 'Ada' });
	});
});
