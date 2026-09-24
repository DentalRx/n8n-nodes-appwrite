import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { searchWebhooks } from '../nodes/Appwrite/methods/listSearch';
import {
	BASE_URL,
	createExecuteContext,
	createLoadOptionsContext,
	node,
} from './helpers/mock-context';

/** A webhook as Appwrite returns it from GET /webhooks/{id}. */
const CURRENT: IDataObject = {
	$id: 'order-sync',
	name: 'Order sync',
	url: 'https://example.com/hook',
	events: ['users.*.create', 'teams.*.create'],
	enabled: false,
	tls: true,
	authUsername: 'n8n',
	authPassword: 'hunter22',
	logs: '',
	attempts: 3,
};

const locator = (value: string, mode = 'id') => ({ __rl: true, mode, value });

async function run(parameters: INodeParameters, respond: () => unknown = () => CURRENT) {
	const { context, requests } = createExecuteContext({
		parameters: { resource: 'webhook', ...parameters },
		respond,
	});
	const [output] = await node.execute.call(context);
	return { output, requests };
}

describe('Webhook › Create', () => {
	const base = {
		operation: 'create',
		name: 'Order sync',
		url: 'https://example.com/hook',
		webhookId: 'order-sync',
	};

	it('reads events as a comma-separated list', async () => {
		const { requests } = await run({
			...base,
			webhookEvents: ' users.*.create, teams.*.update ,',
		});
		expect(requests[0].body).toEqual({
			webhookId: 'order-sync',
			name: 'Order sync',
			url: 'https://example.com/hook',
			events: ['users.*.create', 'teams.*.update'],
		});
	});

	it('reads events as a JSON array', async () => {
		const { requests } = await run({ ...base, webhookEvents: '["users.*.create"]' });
		expect((requests[0].body as IDataObject).events).toEqual(['users.*.create']);
	});

	it('sends the delivery options and lets Appwrite generate a blank secret', async () => {
		const { requests } = await run({
			...base,
			webhookEvents: 'users.*.create',
			options: {
				enabled: false,
				tls: true,
				authUsername: 'n8n',
				authPassword: 'hunter22',
				webhookSecret: '',
			},
		});
		expect(requests[0].body).toMatchObject({
			enabled: false,
			tls: true,
			authUsername: 'n8n',
			authPassword: 'hunter22',
		});
		expect(requests[0].body).not.toHaveProperty('secret');
	});
});

describe('Webhook › Update', () => {
	it('resends every setting the user did not change, since PUT replaces the webhook', async () => {
		const { requests } = await run({
			operation: 'update',
			webhookId: locator('order-sync'),
			updateFields: { url: 'https://example.com/new-hook' },
		});

		expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
			`GET ${BASE_URL}/webhooks/order-sync`,
			`PUT ${BASE_URL}/webhooks/order-sync`,
		]);
		expect(requests[1].body).toEqual({
			name: 'Order sync',
			url: 'https://example.com/new-hook',
			events: ['users.*.create', 'teams.*.create'],
			enabled: false,
			tls: true,
			authUsername: 'n8n',
			authPassword: 'hunter22',
		});
	});

	it('applies every changed setting', async () => {
		const { requests } = await run({
			operation: 'update',
			webhookId: locator('order-sync'),
			updateFields: {
				name: 'Renamed',
				events: '["rows.*"]',
				enabled: true,
				tls: false,
				authUsername: 'other',
				authPassword: 'secret-2',
			},
		});
		expect(requests[1].body).toEqual({
			name: 'Renamed',
			url: 'https://example.com/hook',
			events: ['rows.*'],
			enabled: true,
			tls: false,
			authUsername: 'other',
			authPassword: 'secret-2',
		});
	});

	it('keeps the required settings when left blank, and clears basic authentication', async () => {
		const { requests } = await run({
			operation: 'update',
			webhookId: locator('order-sync'),
			updateFields: { name: '', url: '', events: '', authUsername: '', authPassword: '' },
		});
		expect(requests[1].body).toMatchObject({
			name: 'Order sync',
			url: 'https://example.com/hook',
			events: ['users.*.create', 'teams.*.create'],
			authUsername: '',
			authPassword: '',
		});
	});
});

describe('Webhook › other operations', () => {
	it('takes the webhook from a Console URL', async () => {
		const { requests } = await run({
			operation: 'get',
			webhookId: locator(
				'https://cloud.appwrite.io/console/project-fra-demo/settings/webhooks/order-sync?tab=logs',
				'url',
			),
		});
		expect(requests[0].url).toBe(`${BASE_URL}/webhooks/order-sync`);
	});

	it('leaves the password out of simplified output', async () => {
		const { output } = await run({
			operation: 'get',
			webhookId: locator('order-sync'),
			simplify: true,
		});
		expect(output[0].json).not.toHaveProperty('authPassword');
		expect(output[0].json).toMatchObject({ $id: 'order-sync', url: 'https://example.com/hook' });
	});

	it('lets Appwrite generate the new secret when none is given', async () => {
		const { requests } = await run({
			operation: 'updateSecret',
			webhookId: locator('order-sync'),
		});
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].url).toBe(`${BASE_URL}/webhooks/order-sync/secret`);
		expect(requests[0].body).toEqual({});
	});

	it('outputs the deleted webhook ID', async () => {
		const { output } = await run({ operation: 'delete', webhookId: locator('order-sync') });
		expect(output[0].json).toEqual({ deleted: true, webhookId: 'order-sync' });
	});
});

describe('Webhook › list search', () => {
	it('filters by name or ID itself, since the webhooks list takes no search parameter', async () => {
		const { context, requests } = createLoadOptionsContext({
			respond: () => ({
				webhooks: [
					{ $id: 'order-sync', name: 'Order sync' },
					{ $id: 'slack', name: 'Slack alerts' },
					{ $id: 'orders-backup', name: '' },
				],
			}),
		});

		const result = await searchWebhooks.call(context, 'ORDER');

		expect(result.results).toEqual([
			{ name: 'Order sync', value: 'order-sync' },
			{ name: 'orders-backup', value: 'orders-backup' },
		]);
		expect(requests[0].url).toBe(`${BASE_URL}/webhooks`);
		expect((requests[0].qs as IDataObject).search).toBeUndefined();
	});
});
