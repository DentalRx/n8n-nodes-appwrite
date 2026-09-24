import type { IDataObject, IHttpRequestOptions, INodeParameters } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { searchApps } from '../nodes/Appwrite/methods/listSearch';
import { getAppInstallationScopes } from '../nodes/Appwrite/methods/loadOptions';
import api from './fixtures/appwrite-api.json';
import {
	BASE_URL,
	createExecuteContext,
	createLoadOptionsContext,
	node,
} from './helpers/mock-context';

const operations = api.operations as Record<string, { body: Record<string, unknown> }>;

const appLocator = { __rl: true, mode: 'id', value: 'app1' };
const teamLocator = { __rl: true, mode: 'id', value: 'team1' };

/** An app as Appwrite returns it, with every detail PUT /apps/{appId} replaces set. */
const CURRENT_APP: IDataObject = {
	$id: 'app1',
	name: 'Acme Sync',
	description: 'Syncs things',
	clientUri: 'https://acme.example',
	logoUri: 'https://acme.example/logo.png',
	privacyPolicyUrl: 'https://acme.example/privacy',
	termsUrl: 'https://acme.example/terms',
	contacts: ['support@acme.example'],
	tagline: 'Sync everything',
	tags: ['sync'],
	labels: ['featured'],
	images: [],
	supportUrl: 'https://acme.example/support',
	dataDeletionUrl: 'https://acme.example/delete',
	redirectUris: ['https://acme.example/callback'],
	postLogoutRedirectUris: [],
	enabled: true,
	type: 'confidential',
	deviceFlow: false,
	teamId: 'team1',
	userId: '',
	installationScopes: ['project:databases.read'],
	installationRedirectUrl: 'https://acme.example/setup',
	secrets: [],
};

async function run(
	resource: string,
	parameters: INodeParameters,
	respond: (request: IHttpRequestOptions) => unknown = () => ({ $id: 'x' }),
) {
	const { context, requests } = createExecuteContext({
		parameters: { resource, ...parameters },
		respond,
	});
	const [output] = await node.execute.call(context);
	return { output, requests };
}

describe('App', () => {
	it('creates an app, sending list fields as arrays and the client type under its API name', async () => {
		const { requests } = await run('app', {
			operation: 'create',
			appId: 'app1',
			name: 'Acme Sync',
			options: {
				appClientType: 'public',
				appTags: 'sync, automation',
				deviceFlow: true,
			},
		});

		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/apps`);
		// Redirect URIs are required even when there are none; no team means none is sent.
		expect(requests[0].body).toEqual({
			appId: 'app1',
			name: 'Acme Sync',
			redirectUris: [],
			type: 'public',
			tags: ['sync', 'automation'],
			deviceFlow: true,
		});
	});

	it('creates an app owned by a team', async () => {
		const { requests } = await run('app', {
			operation: 'create',
			name: 'Acme Sync',
			redirectUris: '["https://acme.example/callback"]',
			teamId: teamLocator,
		});
		expect(requests[0].body).toMatchObject({
			redirectUris: ['https://acme.example/callback'],
			teamId: 'team1',
		});
	});

	describe('Update', () => {
		const update = async (updateFields: INodeParameters) =>
			await run('app', { operation: 'update', appId: appLocator, updateFields }, (request) =>
				request.method === 'GET' ? CURRENT_APP : { $id: 'app1' },
			);

		it('reads the app first and resends every detail, because PUT replaces them all', async () => {
			const { requests } = await update({ appTags: 'sync, beta' });

			expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
				`GET ${BASE_URL}/apps/app1`,
				`PUT ${BASE_URL}/apps/app1`,
			]);
			const body = requests[1].body as IDataObject;
			expect(Object.keys(body).sort()).toEqual(
				Object.keys(operations['PUT /apps/{appId}'].body).sort(),
			);
			expect(body).toMatchObject({
				name: 'Acme Sync',
				tags: ['sync', 'beta'],
				redirectUris: ['https://acme.example/callback'],
				installationScopes: ['project:databases.read'],
			});
		});

		it('keeps the current name when Name is added but left blank', async () => {
			const { requests } = await update({ name: '', installationScopes: [] });
			expect(requests[1].body).toMatchObject({ name: 'Acme Sync', installationScopes: [] });
		});
	});

	it('updates labels, replacing the current ones', async () => {
		const { requests } = await run('app', {
			operation: 'updateLabels',
			appId: appLocator,
			labels: 'featured, internal',
		});
		expect(requests[0].method).toBe('PUT');
		expect(requests[0].url).toBe(`${BASE_URL}/apps/app1/labels`);
		expect(requests[0].body).toEqual({ labels: ['featured', 'internal'] });
	});

	it('transfers an app to a team', async () => {
		const { requests } = await run('app', {
			operation: 'transfer',
			appId: appLocator,
			teamId: teamLocator,
		});
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].url).toBe(`${BASE_URL}/apps/app1/team`);
		expect(requests[0].body).toEqual({ teamId: 'team1' });
	});

	it.each([
		['createKey', 'POST', '/apps/app1/keys'],
		['createSecret', 'POST', '/apps/app1/secrets'],
		['getManyInstallationScopes', 'GET', '/apps/scopes/installations'],
		['getManyOAuth2Scopes', 'GET', '/apps/scopes/oauth2'],
	])('%s calls %s %s', async (operation, method, path) => {
		const { requests } = await run('app', { operation, appId: appLocator }, () => ({
			$id: 'x',
			scopes: [{ value: 'account' }],
		}));
		expect(requests[0].method).toBe(method);
		expect(requests[0].url).toBe(`${BASE_URL}${path}`);
	});

	it('issues a token for an installation', async () => {
		const { requests } = await run('app', {
			operation: 'createInstallationToken',
			appId: appLocator,
			installationId: 'inst1',
		});
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/apps/app1/installations/inst1/tokens`);
	});

	it('revokes every token of an app and confirms it', async () => {
		const { output, requests } = await run('app', {
			operation: 'revokeTokens',
			appId: appLocator,
		});
		expect(requests[0].method).toBe('DELETE');
		expect(requests[0].url).toBe(`${BASE_URL}/apps/app1/tokens`);
		expect(output[0].json).toEqual({ revoked: true, appId: 'app1' });
	});

	it('lists apps by name, filtering them here since the endpoint has no search', async () => {
		const { context, requests } = createLoadOptionsContext({
			respond: () => ({
				apps: [
					{ $id: 'a1', name: 'Acme Sync' },
					{ $id: 'a2', name: 'Billing' },
				],
			}),
		});
		expect((await searchApps.call(context, 'acme')).results).toEqual([
			{ name: 'Acme Sync', value: 'a1' },
		]);
		expect((requests[0].qs as IDataObject).search).toBeUndefined();
	});

	it('offers the installation scopes Appwrite still grants, sorted', async () => {
		const { context } = createLoadOptionsContext({
			respond: () => ({
				scopes: [
					{ value: 'project:users.read', description: 'Read users', deprecated: false },
					{ value: 'project:legacy', description: 'Old', deprecated: true },
					{ value: 'organization:organization.read', description: 'Read org', deprecated: false },
				],
			}),
		});
		expect(await getAppInstallationScopes.call(context)).toEqual([
			{
				name: 'organization:organization.read',
				value: 'organization:organization.read',
				description: 'Read org',
			},
			{ name: 'project:users.read', value: 'project:users.read', description: 'Read users' },
		]);
	});
});

describe('Team installations', () => {
	it('installs an app on a team, sending the authorization details as a JSON string', async () => {
		const { requests } = await run('team', {
			operation: 'createInstallation',
			teamId: teamLocator,
			appId: appLocator,
			options: { authorizationDetails: '[{"type": "project", "identifiers": ["*"]}]' },
		});
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/teams/team1/installations`);
		expect(requests[0].body).toEqual({
			appId: 'app1',
			authorizationDetails: '[{"type":"project","identifiers":["*"]}]',
		});
	});

	it('updates an installation, keeping its details when none are given', async () => {
		const { requests } = await run('team', {
			operation: 'updateInstallation',
			teamId: teamLocator,
			installationId: 'inst1',
		});
		expect(requests[0].method).toBe('PUT');
		expect(requests[0].url).toBe(`${BASE_URL}/teams/team1/installations/inst1`);
		expect(requests[0].body).toEqual({});
	});

	it('uninstalls an app and confirms it', async () => {
		const { output, requests } = await run('team', {
			operation: 'deleteInstallation',
			teamId: teamLocator,
			installationId: 'inst1',
		});
		expect(requests[0].method).toBe('DELETE');
		expect(output[0].json).toEqual({ deleted: true, teamId: 'team1', installationId: 'inst1' });
	});

	it('lists the installations of a team', async () => {
		const { output, requests } = await run(
			'team',
			{ operation: 'getManyInstallations', teamId: teamLocator, limit: 5 },
			() => ({ total: 1, installations: [{ $id: 'inst1', appId: 'app1' }] }),
		);
		expect(requests[0].url).toBe(`${BASE_URL}/teams/team1/installations`);
		expect(output.map((item) => item.json)).toEqual([{ $id: 'inst1', appId: 'app1' }]);
	});
});
