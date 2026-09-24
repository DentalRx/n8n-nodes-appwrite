import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { ORGANIZATION_RESOURCES } from '../nodes/Appwrite/helpers/organization';
import {
	searchDnsRecords,
	searchDomains,
	searchOrganizationProjectKeys,
	searchOrganizationProjects,
} from '../nodes/Appwrite/methods/organizationListSearch';
import { appwriteApiRequest } from '../nodes/Appwrite/transport';
import type { Responder } from './helpers/mock-context';
import {
	BASE_URL,
	CREDENTIALS,
	ORGANIZATION_CREDENTIALS,
	createExecuteContext,
	createLoadOptionsContext,
	node,
} from './helpers/mock-context';
import { casesFor, operationsOf, universalResponse } from './helpers/smoke-cases';

/**
 * The organization-level resources (Organization, Organization Project and
 * Domain), which authenticate with the Appwrite Organization API credential
 * instead of the project's.
 */

const locator = (value: string, mode = 'id') => ({ __rl: true, mode, value });

async function run(parameters: INodeParameters, respond: Responder = () => ({})) {
	const { context, requests, credentialTypes } = createExecuteContext({ parameters, respond });
	const [output] = await node.execute.call(context);
	return { output, requests, credentialTypes, body: (index = 0) => requests[index].body };
}

describe('organization credential', () => {
	it('authenticates every request of the organization-level resources with it', async () => {
		for (const resource of ORGANIZATION_RESOURCES) {
			for (const operation of operationsOf(resource)) {
				const [, filled] = casesFor(resource, operation);
				const { context, credentialTypes, credentialReads } = createExecuteContext({
					parameters: filled.parameters,
					respond: universalResponse,
				});
				await node.execute.call(context);
				expect(credentialTypes.length, `${resource} › ${operation}`).toBeGreaterThan(0);
				for (const type of [...credentialTypes, ...credentialReads]) {
					expect(type, `${resource} › ${operation}`).toBe('appwriteOrganizationApi');
				}
			}
		}
	});

	it('keeps every other resource on the project credential', async () => {
		const { context, credentialTypes, credentialReads } = createExecuteContext({
			parameters: { resource: 'database', operation: 'getMany' },
			respond: () => ({ databases: [] }),
		});
		await node.execute.call(context);
		expect(credentialTypes).toEqual(['appwriteApi']);
		expect(credentialReads).toEqual(['appwriteApi']);
	});

	it('reads the base URL from the credential the request authenticates with', async () => {
		const { context, requests, credentialTypes } = createExecuteContext({
			parameters: { resource: 'organization', operation: 'get' },
			credentials: {
				appwriteOrganizationApi: {
					...ORGANIZATION_CREDENTIALS,
					endpoint: 'https://appwrite.example.com/v1//',
				},
			},
		});
		await node.execute.call(context);
		expect(requests[0].url).toBe('https://appwrite.example.com/v1/organization');
		expect(credentialTypes).toEqual(['appwriteOrganizationApi']);
	});

	it('sends a project request exactly as before when no credential type is given', async () => {
		const { context, requests, credentialTypes } = createExecuteContext({
			parameters: { resource: 'database', operation: 'getMany' },
		});
		await appwriteApiRequest.call(context, 'GET', '/tablesdb', { qs: { search: 'x' } });
		expect(credentialTypes).toEqual(['appwriteApi']);
		expect(requests[0]).toEqual({
			method: 'GET',
			url: `${BASE_URL}/tablesdb`,
			headers: { 'content-type': 'application/json' },
			json: true,
			qs: { search: 'x' },
		});
		expect(CREDENTIALS.endpoint).toBe(`${BASE_URL}/`);
	});

	it('is refused for the project resources, as n8n refuses a hidden credential', async () => {
		const { context } = createExecuteContext({
			parameters: { resource: 'database', operation: 'getMany' },
		});
		await expect(
			appwriteApiRequest.call(context, 'GET', '/organization', {
				credentialType: 'appwriteOrganizationApi',
			}),
		).rejects.toThrow('appwriteOrganizationApi');
	});
});

describe('Organization', () => {
	it('names the organization it deleted, from the credential', async () => {
		const { output, requests } = await run({ resource: 'organization', operation: 'delete' });
		expect(requests[0].method).toBe('DELETE');
		expect(requests[0].url).toBe(`${BASE_URL}/organization`);
		expect(output[0].json).toEqual({ deleted: true, organizationId: 'test-organization' });
	});

	it('invites a member with only the fields that are set', async () => {
		const { body } = await run({
			resource: 'organization',
			operation: 'createMembership',
			email: 'ada@example.com',
			roles: 'developer, owner',
			options: { name: 'Ada' },
		});
		expect(body()).toEqual({
			email: 'ada@example.com',
			roles: ['developer', 'owner'],
			name: 'Ada',
		});
	});

	it('stops before inviting no one', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'organization', operation: 'createMembership', roles: 'owner' },
		});
		await expect(node.execute.call(context)).rejects.toThrow(NodeOperationError);
		expect(requests).toHaveLength(0);
	});

	it('sends authorization details as the JSON string Appwrite expects', async () => {
		const { requests, body } = await run({
			resource: 'organization',
			operation: 'createInstallation',
			installationAppId: 'crm',
			options: { authorizationDetails: '[{"type": "project", "identifiers": ["*"]}]' },
		});
		expect(requests[0].url).toBe(`${BASE_URL}/organization/installations`);
		expect(body()).toEqual({
			appId: 'crm',
			authorizationDetails: '[{"type":"project","identifiers":["*"]}]',
		});
	});
});

describe('Organization Project', () => {
	it('generates a project ID and sends the region only when one is chosen', async () => {
		const { body } = await run({
			resource: 'organizationProject',
			operation: 'create',
			name: 'Shop',
		});
		const sent = body() as IDataObject;
		expect(sent.name).toBe('Shop');
		expect(sent.projectId).toMatch(/^[a-z0-9][a-z0-9-]*$/);
		expect(sent).not.toHaveProperty('region');

		const withRegion = await run({
			resource: 'organizationProject',
			operation: 'create',
			organizationProjectId: 'shop',
			name: 'Shop',
			options: { projectRegion: 'syd' },
		});
		expect(withRegion.body()).toEqual({ projectId: 'shop', name: 'Shop', region: 'syd' });
	});

	it('updates an API key without dropping the settings the user did not change', async () => {
		const { requests, body } = await run(
			{
				resource: 'organizationProject',
				operation: 'updateKey',
				organizationProjectId: locator('shop'),
				organizationProjectKeyId: locator('k1'),
				updateFields: { name: 'Renamed' },
			},
			() => ({ $id: 'k1', name: 'Old', scopes: ['users.read'], expire: null }),
		);
		expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
			`GET ${BASE_URL}/organization/projects/shop/keys/k1`,
			`PUT ${BASE_URL}/organization/projects/shop/keys/k1`,
		]);
		expect(body(1)).toEqual({ name: 'Renamed', scopes: ['users.read'], expire: null });
	});

	it('takes the key from a Console URL', async () => {
		const { requests } = await run({
			resource: 'organizationProject',
			operation: 'getKey',
			organizationProjectId: locator('shop'),
			organizationProjectKeyId: locator(
				'https://cloud.appwrite.io/console/project-fra-shop/overview/api-keys/k1',
				'url',
			),
		});
		expect(requests[0].url).toBe(`${BASE_URL}/organization/projects/shop/keys/k1`);
	});
});

describe('Domain', () => {
	const domain = locator('d1');

	it("adds a domain to the credential's organization", async () => {
		const { body } = await run({
			resource: 'domain',
			operation: 'create',
			domain: ' example.com ',
		});
		expect(body()).toEqual({ teamId: 'test-organization', domain: 'example.com' });
	});

	it.each([
		['a', {}, {}],
		['mx', { dnsRecordPriority: 5 }, { priority: 5 }],
		[
			'srv',
			{ dnsRecordPriority: 1, dnsRecordWeight: 2, dnsRecordPort: 5060 },
			{
				priority: 1,
				weight: 2,
				port: 5060,
			},
		],
	])('creates a %s record with the fields of its type', async (type, extra, expected) => {
		const { requests, body } = await run({
			resource: 'domain',
			operation: 'createRecord',
			domainId: domain,
			dnsRecordType: type,
			name: 'www',
			value: 'target.example.com',
			ttl: 300,
			...extra,
		});
		expect(requests[0].url).toBe(`${BASE_URL}/domains/d1/records/${type}`);
		expect(body()).toEqual({ name: 'www', value: 'target.example.com', ttl: 300, ...expected });
	});

	it('updates a record by resending what the user did not change', async () => {
		const { requests, body } = await run(
			{
				resource: 'domain',
				operation: 'updateRecord',
				domainId: domain,
				dnsRecordId: locator('r1'),
				dnsRecordType: 'mx',
				updateFields: { ttl: 60 },
			},
			() => ({
				$id: 'r1',
				type: 'MX',
				name: '@',
				value: 'mail.example.com',
				ttl: 3600,
				priority: 10,
				comment: 'Primary mail',
			}),
		);
		expect(requests[1].method).toBe('PUT');
		expect(requests[1].url).toBe(`${BASE_URL}/domains/d1/records/mx/r1`);
		expect(body(1)).toEqual({
			name: '@',
			value: 'mail.example.com',
			ttl: 60,
			priority: 10,
			comment: 'Primary mail',
		});
	});

	it('refuses to update a record as another type than it is', async () => {
		const { context, requests } = createExecuteContext({
			parameters: {
				resource: 'domain',
				operation: 'updateRecord',
				domainId: domain,
				dnsRecordId: locator('r1'),
				dnsRecordType: 'a',
				updateFields: { value: '203.0.113.1' },
			},
			respond: () => ({ $id: 'r1', type: 'CNAME', name: 'www', value: 'x.example.com', ttl: 1 }),
		});
		await expect(node.execute.call(context)).rejects.toThrow('The record is a CNAME record, not A');
		expect(requests).toHaveLength(1);
	});

	it('returns the zone file as text', async () => {
		const zone = '$ORIGIN example.com.\nwww 3600 IN A 203.0.113.10\n';
		const { output, requests } = await run(
			{ resource: 'domain', operation: 'getZone', domainId: domain },
			() => Buffer.from(zone),
		);
		expect(requests[0].url).toBe(`${BASE_URL}/domains/d1/zone`);
		expect(requests[0].encoding).toBe('arraybuffer');
		expect(output[0].json).toEqual({ domainId: 'd1', zone });
	});

	it('checks prices for a list of domains, one item per domain', async () => {
		const { output, requests } = await run(
			{
				resource: 'domain',
				operation: 'listPrices',
				domainNames: 'example.com, example.io',
				options: { domainPeriodYears: 2, domainRegistrationType: 'renewal' },
			},
			() => ({ total: 2, prices: [{ domain: 'example.com' }, { domain: 'example.io' }] }),
		);
		expect(requests[0].url).toBe(`${BASE_URL}/domains/prices`);
		expect(requests[0].qs).toEqual({
			'domains[0]': 'example.com',
			'domains[1]': 'example.io',
			periodYears: 2,
			registrationType: 'renewal',
		});
		expect(output.map((item) => item.json.domain)).toEqual(['example.com', 'example.io']);
	});

	it("points a domain back to Appwrite's nameservers when none are given", async () => {
		const { body } = await run({
			resource: 'domain',
			operation: 'updateNameservers',
			domainId: domain,
		});
		expect(body()).toEqual({});

		const custom = await run({
			resource: 'domain',
			operation: 'updateNameservers',
			domainId: domain,
			options: { domainNameservers: 'ns1.example.net, ns2.example.net' },
		});
		expect(custom.body()).toEqual({ nameservers: ['ns1.example.net', 'ns2.example.net'] });
	});

	it('adds a preset and outputs the records it created', async () => {
		const { output, requests } = await run(
			{ resource: 'domain', operation: 'createPreset', domainId: domain, domainPreset: 'zoho' },
			() => ({ total: 2, dnsRecords: [{ $id: 'r1' }, { $id: 'r2' }] }),
		);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/domains/d1/presets/zoho`);
		expect(output.map((item) => item.json.$id)).toEqual(['r1', 'r2']);
	});
});

describe('organization list search', () => {
	it('lists projects with the organization credential and Appwrite search', async () => {
		const { context, requests, credentialTypes } = createLoadOptionsContext({
			current: { resource: 'organizationProject' },
			respond: () => ({ projects: [{ $id: 'shop', name: 'Shop' }] }),
		});
		expect(await searchOrganizationProjects.call(context, 'sh')).toEqual({
			results: [{ name: 'Shop', value: 'shop' }],
			paginationToken: undefined,
		});
		expect(requests[0].url).toBe(`${BASE_URL}/organization/projects`);
		expect((requests[0].qs as IDataObject).search).toBe('sh');
		expect(credentialTypes).toEqual(['appwriteOrganizationApi']);
	});

	it("lists a project's keys once the project is chosen", async () => {
		const empty = createLoadOptionsContext({
			current: { resource: 'organizationProject', organizationProjectId: locator('', 'list') },
		});
		expect(await searchOrganizationProjectKeys.call(empty.context)).toEqual({ results: [] });
		expect(empty.requests).toHaveLength(0);

		const { context, requests } = createLoadOptionsContext({
			current: { resource: 'organizationProject', organizationProjectId: locator('shop') },
			respond: () => ({
				keys: [
					{ $id: 'k1', name: 'Deploys' },
					{ $id: 'k2', name: 'Backups' },
				],
			}),
		});
		expect((await searchOrganizationProjectKeys.call(context, 'back')).results).toEqual([
			{ name: 'Backups', value: 'k2' },
		]);
		expect(requests[0].url).toBe(`${BASE_URL}/organization/projects/shop/keys`);
		expect((requests[0].qs as IDataObject).search).toBeUndefined();
	});

	it('lists domains by their name and DNS records by name, type and value', async () => {
		const domains = createLoadOptionsContext({
			current: { resource: 'domain' },
			respond: () => ({ domains: [{ $id: 'd1', domain: 'example.com' }] }),
		});
		expect((await searchDomains.call(domains.context)).results).toEqual([
			{ name: 'example.com', value: 'd1' },
		]);
		expect(domains.credentialTypes).toEqual(['appwriteOrganizationApi']);

		const records = createLoadOptionsContext({
			current: {
				resource: 'domain',
				domainId: locator(
					'https://cloud.appwrite.io/console/organization-o1/domains/domain-d1',
					'url',
				),
			},
			respond: () => ({
				dnsRecords: [{ $id: 'r1', name: 'www', type: 'CNAME', value: 'appwrite.network' }],
			}),
		});
		expect((await searchDnsRecords.call(records.context)).results).toEqual([
			{ name: 'www CNAME appwrite.network', value: 'r1' },
		]);
		expect(records.requests[0].url).toBe(`${BASE_URL}/domains/d1/records`);
	});
});
