import type { INodeParameters } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import api from './fixtures/appwrite-api.json';
import type { Responder } from './helpers/mock-context';
import { BASE_URL, CREDENTIALS, createExecuteContext, node } from './helpers/mock-context';

/**
 * The project's OAuth2 server is called by three parties, and each operation
 * must act as the one Appwrite expects: the app (the OAuth2 client) proves
 * itself with its ID and secret and never sends the API key, the consent page
 * acts as the signed-in user, and the user's browser opens URLs the node only
 * builds.
 */

const operations = api.operations as Record<string, { query: Record<string, unknown> }>;

const JSON_HEADER = { 'content-type': 'application/json' };
const PROJECT_HEADER = { 'X-Appwrite-Project': CREDENTIALS.projectId };
const OAUTH2 = `${BASE_URL}/oauth2/${String(CREDENTIALS.projectId)}`;
const APP = { __rl: true, mode: 'id', value: 'app-1' };

async function run(parameters: INodeParameters, respond?: Responder) {
	const { context, requests, withApiKey } = createExecuteContext({
		parameters: { resource: 'oauth2Server', ...parameters },
		respond,
	});
	const [output] = await node.execute.call(context);
	return { output, requests, withApiKey };
}

async function failure(parameters: INodeParameters) {
	const { context, requests } = createExecuteContext({
		parameters: { resource: 'oauth2Server', ...parameters },
	});
	const error = await node.execute.call(context).catch((caught: unknown) => caught);
	return { error: error as NodeOperationError, requests };
}

/** The query keys of a URL, without their bracketed array index. */
const queryKeys = (url: string): string[] => [
	...new Set([...new URL(url).searchParams.keys()].map((key) => key.split('[')[0])),
];

describe('OAuth2 Server operations of the app', () => {
	it('exchange an authorization code as the app, never with the API key', async () => {
		const tokens = { access_token: 'access', refresh_token: 'refresh', token_type: 'Bearer' };
		const { output, requests, withApiKey } = await run(
			{
				operation: 'createToken',
				appId: APP,
				oauth2ClientSecret: 'client-secret',
				oauth2Code: 'auth-code',
				oauth2RedirectUri: 'https://example.com/callback',
				options: { oauth2CodeVerifier: 'verifier', oauth2Resource: 'https://api.example.com/' },
			},
			() => tokens,
		);

		expect(withApiKey).toEqual([false]);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${OAUTH2}/token`);
		expect(requests[0].headers).toEqual({ ...JSON_HEADER, ...PROJECT_HEADER });
		expect(requests[0].body).toEqual({
			grant_type: 'authorization_code',
			client_id: 'app-1',
			client_secret: 'client-secret',
			code: 'auth-code',
			redirect_uri: 'https://example.com/callback',
			code_verifier: 'verifier',
			resource: ['https://api.example.com/'],
		});
		expect(output).toEqual([{ json: tokens, pairedItem: { item: 0 } }]);
	});

	it('send no secret for a public app, which proves itself with PKCE', async () => {
		const { requests } = await run({
			operation: 'createToken',
			appId: APP,
			appClientType: 'public',
			oauth2Code: 'auth-code',
			oauth2RedirectUri: 'https://example.com/callback',
			oauth2CodeVerifier: 'verifier',
		});

		expect(requests[0].body).toEqual({
			grant_type: 'authorization_code',
			client_id: 'app-1',
			code: 'auth-code',
			redirect_uri: 'https://example.com/callback',
			code_verifier: 'verifier',
		});
	});

	it.each([
		['refresh_token', { oauth2RefreshToken: 'refresh' }, { refresh_token: 'refresh' }],
		[
			'urn:ietf:params:oauth:grant-type:device_code',
			{ oauth2DeviceCode: 'device' },
			{ device_code: 'device' },
		],
	])('send only what the %s grant needs', async (grantType, fields, sent) => {
		const { requests } = await run({
			operation: 'createToken',
			appId: APP,
			oauth2ClientSecret: 'client-secret',
			oauth2GrantType: grantType,
			...fields,
		});

		expect(requests[0].body).toEqual({
			grant_type: grantType,
			client_id: 'app-1',
			client_secret: 'client-secret',
			...sent,
		});
	});

	it('stop before sending anything when a confidential app has no secret', async () => {
		const { error, requests } = await failure({
			operation: 'createToken',
			appId: APP,
			oauth2Code: 'auth-code',
			oauth2RedirectUri: 'https://example.com/callback',
		});

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error.message).toBe("The 'Client Secret' parameter is empty");
		expect(requests).toHaveLength(0);
	});

	it('revoke a token and report it, without echoing the token', async () => {
		const { output, requests, withApiKey } = await run(
			{
				operation: 'revokeToken',
				appId: APP,
				oauth2ClientSecret: 'client-secret',
				oauth2Token: 'refresh',
				options: { oauth2TokenTypeHint: 'refresh_token' },
			},
			() => '',
		);

		expect(withApiKey).toEqual([false]);
		expect(requests[0].url).toBe(`${OAUTH2}/revoke`);
		expect(requests[0].body).toEqual({
			token: 'refresh',
			token_type_hint: 'refresh_token',
			client_id: 'app-1',
			client_secret: 'client-secret',
		});
		expect(output).toEqual([{ json: { revoked: true }, pairedItem: { item: 0 } }]);
	});

	it('send scopes space-separated and authorization details as a JSON string', async () => {
		const { requests, withApiKey } = await run({
			operation: 'createDeviceAuthorization',
			appId: APP,
			options: {
				oauth2Scopes: 'openid, email profile',
				authorizationDetails: '[{"type": "calendar", "actions": ["read"]}]',
				oauth2Resource: 'https://a.example.com/, https://b.example.com/',
			},
		});

		expect(withApiKey).toEqual([false]);
		expect(requests[0].url).toBe(`${OAUTH2}/device_authorization`);
		expect(requests[0].body).toEqual({
			client_id: 'app-1',
			scope: 'openid email profile',
			authorization_details: '[{"type":"calendar","actions":["read"]}]',
			resource: ['https://a.example.com/', 'https://b.example.com/'],
		});
	});

	it('push an authorization request, with the S256 method for a code challenge', async () => {
		const { requests } = await run({
			operation: 'createPushedAuthorizationRequest',
			appId: APP,
			oauth2RedirectUri: 'https://example.com/callback',
			options: {
				oauth2CodeChallenge: 'challenge',
				oauth2Prompt: ['consent', 'login'],
				oauth2MaxAge: 600,
				oauth2State: 'state-1',
			},
		});

		expect(requests[0].url).toBe(`${OAUTH2}/par`);
		expect(requests[0].body).toEqual({
			client_id: 'app-1',
			redirect_uri: 'https://example.com/callback',
			response_type: 'code',
			state: 'state-1',
			code_challenge: 'challenge',
			code_challenge_method: 'S256',
			prompt: 'consent login',
			max_age: 600,
		});
	});

	it('take an app outside the project by the URL of its client metadata document', async () => {
		const metadataUrl = 'https://app-tools.example.com/oauth/client.json';
		const { requests } = await run({
			operation: 'createDeviceAuthorization',
			appId: { __rl: true, mode: 'id', value: metadataUrl },
		});

		expect(requests[0].body).toEqual({ client_id: metadataUrl });
	});
});

describe('OAuth2 Server operations of a consent page', () => {
	it('start an authorization as the signed-in user, asking for a JSON answer', async () => {
		const { output, requests, withApiKey } = await run(
			{
				operation: 'startAuthorization',
				accountJwt: 'user-jwt',
				appId: APP,
				oauth2RedirectUri: 'https://example.com/callback',
				oauth2ResponseType: 'code id_token',
				options: { nonce: 'nonce-1', oauth2Scopes: 'openid' },
			},
			() => ({ grantId: 'grant-1', redirectUrl: '' }),
		);

		expect(withApiKey).toEqual([false]);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${OAUTH2}/authorize`);
		expect(requests[0].headers).toEqual({
			...JSON_HEADER,
			accept: 'application/json',
			...PROJECT_HEADER,
			'X-Appwrite-JWT': 'user-jwt',
		});
		expect(requests[0].body).toEqual({
			client_id: 'app-1',
			redirect_uri: 'https://example.com/callback',
			response_type: 'code id_token',
			scope: 'openid',
			nonce: 'nonce-1',
		});
		expect(output[0].json).toEqual({ grantId: 'grant-1', redirectUrl: '' });
	});

	it('start a pushed request with the client ID and request URI only', async () => {
		const { requests } = await run({
			operation: 'startAuthorization',
			accountJwt: 'user-jwt',
			appId: APP,
			oauth2RequestMode: 'pushed',
			oauth2RequestUri: 'urn:appwrite:oauth2:request:abc',
		});

		expect(requests[0].body).toEqual({
			client_id: 'app-1',
			request_uri: 'urn:appwrite:oauth2:request:abc',
		});
	});

	it('approve with a session secret, narrowing the scopes', async () => {
		const { output, requests, withApiKey } = await run(
			{
				operation: 'approveAuthorization',
				accountAuthentication: 'session',
				accountSessionSecret: 'session-secret',
				oauth2GrantId: 'grant-1',
				options: { oauth2Scopes: 'openid,email' },
			},
			() => ({ redirectUrl: 'https://example.com/callback?code=abc' }),
		);

		expect(withApiKey).toEqual([false]);
		expect(requests[0].url).toBe(`${OAUTH2}/approve`);
		expect(requests[0].headers).toMatchObject({
			accept: 'application/json',
			'X-Appwrite-Session': 'session-secret',
		});
		expect(requests[0].body).toEqual({ grant_id: 'grant-1', scope: 'openid email' });
		expect(output[0].json.redirectUrl).toBe('https://example.com/callback?code=abc');
	});

	it('bind a device user code to the signed-in user', async () => {
		const { requests } = await run({
			operation: 'createDeviceGrant',
			accountJwt: 'user-jwt',
			oauth2UserCode: 'ABCD-EFGH',
		});

		expect(requests[0].url).toBe(`${OAUTH2}/grants`);
		expect(requests[0].body).toEqual({ user_code: 'ABCD-EFGH' });
	});

	it('read a grant with the API key, simplified on request', async () => {
		const grant = {
			$id: 'grant-1',
			$createdAt: '2026-01-01T00:00:00.000+00:00',
			$updatedAt: '2026-01-01T00:00:00.000+00:00',
			userId: 'user-1',
			appId: 'app-1',
			scopes: ['openid'],
			expire: '2026-01-01T00:10:00.000+00:00',
		};
		const { output, requests, withApiKey } = await run(
			{ operation: 'getGrant', oauth2GrantId: 'grant 1', simplify: true },
			() => grant,
		);

		expect(withApiKey).toEqual([true]);
		expect(requests[0].method).toBe('GET');
		expect(requests[0].url).toBe(`${OAUTH2}/grants/grant%201`);
		expect(output[0].json).not.toHaveProperty('$createdAt');
		expect(output[0].json).toMatchObject({ $id: 'grant-1', userId: 'user-1', appId: 'app-1' });
	});

	it('refuse a blank grant ID rather than send it', async () => {
		const { error, requests } = await failure({
			operation: 'rejectAuthorization',
			accountJwt: 'user-jwt',
			oauth2GrantId: ' ',
		});

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error.message).toBe("The 'Grant ID' parameter is empty");
		expect(requests).toHaveLength(0);
	});
});

describe('URLs for the browser', () => {
	it('build the authorization URL without sending a request', async () => {
		const { output, requests } = await run({
			operation: 'getAuthorizationUrl',
			appId: APP,
			oauth2RedirectUri: 'https://example.com/callback',
			options: {
				oauth2Scopes: 'openid email',
				oauth2State: 'a b',
				oauth2Resource: 'https://api.example.com/',
			},
		});

		expect(requests).toHaveLength(0);
		const url = String(output[0].json.url);
		expect(url).toBe(
			`${OAUTH2}/authorize?client_id=app-1&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback` +
				'&response_type=code&scope=openid+email&state=a+b&resource%5B0%5D=https%3A%2F%2Fapi.example.com%2F',
		);
		const accepted = Object.keys(operations['GET /oauth2/{project_id}/authorize'].query);
		expect(queryKeys(url).filter((key) => !accepted.includes(key))).toEqual([]);
	});

	it('point the authorization URL at a pushed request', async () => {
		const { output } = await run({
			operation: 'getAuthorizationUrl',
			appId: APP,
			oauth2RequestMode: 'pushed',
			oauth2RequestUri: 'urn:appwrite:oauth2:request:abc',
		});

		expect(output[0].json.url).toBe(
			`${OAUTH2}/authorize?client_id=app-1&request_uri=urn%3Aappwrite%3Aoauth2%3Arequest%3Aabc`,
		);
	});

	it('build the OAuth2 login URL as the Appwrite web SDK does', async () => {
		const { context, requests } = createExecuteContext({
			parameters: {
				resource: 'account',
				operation: 'getOAuth2LoginUrl',
				oauth2Provider: 'paypalSandbox',
				accountSuccessUrl: 'https://example.com/ok',
				options: { accountFailureUrl: 'https://example.com/fail', accountProviderScopes: 'a, b:c' },
			},
		});
		const [output] = await node.execute.call(context);

		expect(requests).toHaveLength(0);
		const url = String(output[0].json.url);
		// The web SDK's createOAuth2Token: success, failure, scopes[i], then the
		// project, which a browser cannot send as a header.
		expect(url).toBe(
			`${BASE_URL}/account/tokens/oauth2/paypalSandbox?success=https%3A%2F%2Fexample.com%2Fok` +
				'&failure=https%3A%2F%2Fexample.com%2Ffail&scopes%5B0%5D=a&scopes%5B1%5D=b%3Ac' +
				`&project=${String(CREDENTIALS.projectId)}`,
		);
		const accepted = Object.keys(operations['GET /account/tokens/oauth2/{provider}'].query);
		expect(queryKeys(url).filter((key) => !accepted.includes(key))).toEqual(['project']);
	});

	it('offer exactly the providers of the OAuthProvider enum of Appwrite 2.3', () => {
		const provider = node.description.properties.find(
			(property) =>
				property.name === 'oauth2Provider' &&
				(property.displayOptions?.show?.resource as string[]).includes('account'),
		);
		const offered = (provider?.options as Array<{ value: string }>).map((option) => option.value);

		expect([...offered].sort()).toEqual(
			[
				'amazon',
				'apple',
				'appwrite',
				'auth0',
				'authentik',
				'autodesk',
				'bitbucket',
				'bitly',
				'box',
				'cloudflare',
				'dailymotion',
				'discord',
				'disqus',
				'dropbox',
				'etsy',
				'facebook',
				'figma',
				'fusionauth',
				'github',
				'gitlab',
				'google',
				'huggingface',
				'kakao',
				'keycloak',
				'kick',
				'linkedin',
				'microsoft',
				'notion',
				'oidc',
				'okta',
				'paypal',
				'paypalSandbox',
				'podio',
				'resend',
				'salesforce',
				'slack',
				'spotify',
				'stripe',
				'tiktok',
				'tradeshift',
				'tradeshiftBox',
				'twitch',
				'wordpress',
				'x',
				'yahoo',
				'yammer',
				'yandex',
				'zoho',
				'zoom',
			].sort(),
		);
	});
});
