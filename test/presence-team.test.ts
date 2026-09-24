import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { BASE_URL, createExecuteContext, node } from './helpers/mock-context';

const locator = (value: string) => ({ __rl: true, mode: 'id', value });

async function run(parameters: INodeParameters) {
	const { context, requests, withApiKey } = createExecuteContext({
		parameters,
		respond: () => ({ $id: 'x' }),
	});
	const [output] = await node.execute.call(context);
	return { output, requests, withApiKey };
}

describe('Presence › Create or Update and Update', () => {
	it('sets a presence with the API key, naming the user as Appwrite requires', async () => {
		const { requests, withApiKey } = await run({
			resource: 'presence',
			operation: 'upsert',
			presenceId: 'p1',
			userId: locator('u1'),
			presenceStatus: 'online',
			presenceOptions: { metadata: '{"page": "/pricing"}', expiresAt: '2030-01-01T00:00:00Z' },
		});
		expect(requests[0].method).toBe('PUT');
		expect(requests[0].url).toBe(`${BASE_URL}/presences/p1`);
		expect(requests[0].body).toEqual({
			userId: 'u1',
			status: 'online',
			metadata: { page: '/pricing' },
			expiresAt: '2030-01-01T00:00:00Z',
		});
		expect(withApiKey).toEqual([true]);
	});

	it('generates a presence ID when none is given', async () => {
		const { requests } = await run({
			resource: 'presence',
			operation: 'upsert',
			userId: locator('u1'),
			presenceStatus: 'away',
		});
		expect(requests[0].url).toMatch(new RegExp(`^${BASE_URL}/presences/[0-9a-f]{20}$`));
	});

	it('updates only what was set, plus the user', async () => {
		const { requests } = await run({
			resource: 'presence',
			operation: 'update',
			presenceId: 'p1',
			userId: locator('u1'),
			presenceOptions: { status: 'busy', purge: true },
		});
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].body).toEqual({ userId: 'u1', status: 'busy', purge: true });
	});
});

describe('Team › Accept Membership Invitation', () => {
	it('proves the invitation with its secret and sends no API key', async () => {
		const { output, requests, withApiKey } = await run({
			resource: 'team',
			operation: 'updateMembershipStatus',
			teamId: locator('editors'),
			membershipId: 'm1',
			userId: locator('u1'),
			membershipSecret: 's3cret',
		});
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].url).toBe(`${BASE_URL}/teams/editors/memberships/m1/status`);
		expect(requests[0].body).toEqual({ userId: 'u1', secret: 's3cret' });
		const headers = requests[0].headers as IDataObject;
		expect(headers['X-Appwrite-Project']).toBe('test-project');
		expect(Object.keys(headers).map((name) => name.toLowerCase())).not.toContain('x-appwrite-key');
		expect(withApiKey).toEqual([false]);
		expect(output).toHaveLength(1);
	});
});
