import type {
	IDataObject,
	INodeParameters,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { OAUTH2_PROVIDERS } from '../nodes/Appwrite/descriptions/oauth2Providers';
import { PLATFORM_TYPES } from '../nodes/Appwrite/descriptions/PlatformDescription';
import { PROJECT_POLICIES } from '../nodes/Appwrite/descriptions/projectPolicies';
import { searchApiKeys, searchPlatforms } from '../nodes/Appwrite/methods/listSearch';
import api from './fixtures/appwrite-api.json';
import type { Responder } from './helpers/mock-context';
import {
	BASE_URL,
	createExecuteContext,
	createLoadOptionsContext,
	description,
	node,
} from './helpers/mock-context';

/**
 * Project settings: the resources administered with the project's own API key
 * (API keys, email templates, mock phone numbers, OAuth2 providers, platforms,
 * the project itself and its policies, and project variables).
 */

const operations = api.operations as Record<string, { body: Record<string, unknown> }>;

/** The body keys Appwrite documents for an endpoint, sorted. */
const specBody = (endpoint: string): string[] => Object.keys(operations[endpoint].body).sort();

/** The literal endpoints Appwrite documents under a path prefix, e.g. every OAuth2 provider. */
const specFamily = (method: string, prefix: string): string[] =>
	Object.keys(operations)
		.filter((key) => key.startsWith(`${method} ${prefix}`) && !key.includes('{'))
		.map((key) => key.slice(`${method} ${prefix}`.length))
		.sort();

async function run(parameters: INodeParameters, respond: Responder = () => ({})) {
	const { context, requests } = createExecuteContext({ parameters, respond });
	const [output] = await node.execute.call(context);
	return { output, requests, body: (index = 0) => requests[index].body as IDataObject };
}

/** A value for a setting, as a user who added it would enter it. */
function sampleValue(property: INodeProperties): unknown {
	switch (property.type) {
		case 'boolean':
			// false rather than the default, so a dropped false would show.
			return false;
		case 'number':
			return 7;
		case 'multiOptions':
			return [(property.options as INodePropertyOptions[])[0].value];
		case 'options':
			return property.default;
		default:
			return 'sample';
	}
}

/** Every option of a collection filled in. */
const fillAll = (options: INodeProperties[]): INodeParameters =>
	Object.fromEntries(
		options.map((option) => [option.name, sampleValue(option)]),
	) as INodeParameters;

/** The collection a resource and operation show, e.g. Project → Update SMTP's Update Fields. */
function collectionOptions(show: Record<string, string>): INodeProperties[] {
	const collection = description.properties.find(
		(property) =>
			property.type === 'collection' &&
			Object.entries(show).every(([key, value]) =>
				(property.displayOptions?.show?.[key] as string[] | undefined)?.includes(value),
			),
	);
	return (collection?.options ?? []) as INodeProperties[];
}

describe('OAuth2 Provider', () => {
	it('offers exactly the providers whose settings Appwrite lets a server update', () => {
		expect(OAUTH2_PROVIDERS.map((provider) => provider.value).sort()).toEqual(
			specFamily('PATCH', '/project/oauth2/'),
		);
	});

	it.each(OAUTH2_PROVIDERS.map((provider) => [provider.name, provider] as const))(
		'%s sends exactly the settings its endpoint accepts',
		async (_name, provider) => {
			const { requests, body } = await run({
				resource: 'oauth2Provider',
				operation: 'update',
				oauth2Provider: provider.value,
				updateFields: fillAll(provider.fields.map((field) => field.property)),
			});

			expect(requests).toHaveLength(1);
			expect(requests[0].method).toBe('PATCH');
			expect(requests[0].url).toBe(`${BASE_URL}/project/oauth2/${provider.value}`);
			expect(Object.keys(body()).sort()).toEqual(
				specBody(`PATCH /project/oauth2/${provider.value}`),
			);
		},
	);

	it("names each setting as the provider does and sends it under the provider's key", async () => {
		const { body } = await run({
			resource: 'oauth2Provider',
			operation: 'update',
			oauth2Provider: 'dropbox',
			updateFields: { oauth2ClientId: 'app-key', oauth2ClientSecret: 'app-secret' },
		});

		expect(body()).toEqual({ appKey: 'app-key', appSecret: 'app-secret' });
		const dropbox = collectionOptions({ resource: 'oauth2Provider', oauth2Provider: 'dropbox' });
		expect(dropbox.map((option) => option.displayName)).toEqual([
			'App Key',
			'App Secret',
			'Enabled',
		]);
		const secret = dropbox.find((option) => option.name === 'oauth2ClientSecret');
		expect(secret?.typeOptions?.password).toBe(true);
	});

	it('sends only the settings the user added, and lists as arrays', async () => {
		const { body } = await run({
			resource: 'oauth2Provider',
			operation: 'update',
			oauth2Provider: 'google',
			updateFields: { oauth2NativeClientIds: 'ios-client, android-client', enabled: false },
		});

		expect(body()).toEqual({ nativeClientIds: ['ios-client', 'android-client'], enabled: false });
	});

	it('reads one provider by its ID and pages the list by offset', async () => {
		const one = await run({ resource: 'oauth2Provider', operation: 'get', oauth2Provider: 'x' });
		expect(one.requests[0].url).toBe(`${BASE_URL}/project/oauth2/x`);

		const many = await run({ resource: 'oauth2Provider', operation: 'getMany', limit: 5 }, () => ({
			total: 2,
			providers: [{ $id: 'github' }, { $id: 'google' }],
		}));
		expect(many.output.map((item) => item.json.$id)).toEqual(['github', 'google']);
		expect(JSON.parse((many.requests[0].qs as Record<string, string>)['queries[0]'])).toEqual({
			method: 'limit',
			values: [5],
		});
	});
});

describe('Project → Update Policy', () => {
	it('offers exactly the policies Appwrite lets a server update', () => {
		expect(PROJECT_POLICIES.map((policy) => policy.value).sort()).toEqual(
			specFamily('PATCH', '/project/policies/'),
		);
	});

	it.each(PROJECT_POLICIES.map((policy) => [policy.name, policy] as const))(
		'%s sends exactly the settings its endpoint accepts',
		async (_name, policy) => {
			const { requests, body } = await run({
				resource: 'project',
				operation: 'updatePolicy',
				projectPolicy: policy.value,
				...Object.fromEntries(
					policy.required.map((field) => [field.property.name, sampleValue(field.property)]),
				),
				updateFields: fillAll(policy.optional.map((field) => field.property)),
			});

			expect(requests[0].url).toBe(`${BASE_URL}/project/policies/${policy.value}`);
			expect(Object.keys(body()).sort()).toEqual(
				specBody(`PATCH /project/policies/${policy.value}`),
			);
		},
	);

	it('keeps optional settings the user did not add', async () => {
		const { body } = await run({
			resource: 'project',
			operation: 'updatePolicy',
			projectPolicy: 'password-strength',
			updateFields: { passwordMinLength: 12, requireSymbol: true },
		});
		expect(body()).toEqual({ min: 12, symbols: true });
	});

	it('turns password history off with null when the length is 0', async () => {
		const off = await run({
			resource: 'project',
			operation: 'updatePolicy',
			projectPolicy: 'password-history',
			passwordHistoryLength: 0,
		});
		expect(off.body()).toEqual({ total: null });

		const on = await run({
			resource: 'project',
			operation: 'updatePolicy',
			projectPolicy: 'password-history',
			passwordHistoryLength: 10,
		});
		expect(on.body()).toEqual({ total: 10 });
	});
});

describe('Project', () => {
	it('names the deleted project, which is the one the credential points at', async () => {
		const { output, requests } = await run({ resource: 'project', operation: 'delete' });
		expect(requests[0].method).toBe('DELETE');
		expect(requests[0].url).toBe(`${BASE_URL}/project`);
		expect(output.map((item) => item.json)).toEqual([{ deleted: true, projectId: 'test-project' }]);
	});

	it('sends only the SMTP settings the user added, clearing text ones left empty', async () => {
		const { body } = await run({
			resource: 'project',
			operation: 'updateSmtp',
			updateFields: {
				smtpHost: 'smtp.example.com',
				smtpPort: 465,
				smtpSecure: 'ssl',
				smtpUsername: '',
			},
		});
		expect(body()).toEqual({ host: 'smtp.example.com', port: 465, secure: 'ssl', username: '' });
	});

	it('maps every SMTP setting to a key the endpoint accepts', async () => {
		const { body } = await run({
			resource: 'project',
			operation: 'updateSmtp',
			updateFields: fillAll(collectionOptions({ resource: 'project', operation: 'updateSmtp' })),
		});
		expect(Object.keys(body()).sort()).toEqual(specBody('PATCH /project/smtp'));
	});

	it('resends the OAuth2 server settings the user did not change, leaving unset ones out', async () => {
		const current = {
			$id: 'test-project',
			oAuth2ServerEnabled: true,
			oAuth2ServerAuthorizationUrl: 'https://example.com/consent',
			oAuth2ServerScopes: ['openid', 'email'],
			oAuth2ServerAccessTokenDuration: 28800,
			oAuth2ServerUserCodeFormat: 'numeric',
			oAuth2ServerVerificationUrl: '',
		};
		const { requests, body } = await run(
			{
				resource: 'project',
				operation: 'updateOAuth2Server',
				updateFields: {
					oauth2ServerDefaultScopes: 'openid, email',
					oauth2ServerAccessTokenDuration: 3600,
				},
			},
			() => current,
		);

		expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
			`GET ${BASE_URL}/project`,
			`PUT ${BASE_URL}/project/oauth2-server`,
		]);
		expect(body(1)).toEqual({
			enabled: true,
			authorizationUrl: 'https://example.com/consent',
			scopes: ['openid', 'email'],
			defaultScopes: ['openid', 'email'],
			accessTokenDuration: 3600,
			userCodeFormat: 'numeric',
		});
	});

	it('maps every OAuth2 server setting to a key the endpoint accepts', async () => {
		const { body } = await run({
			resource: 'project',
			operation: 'updateOAuth2Server',
			updateFields: fillAll(
				collectionOptions({ resource: 'project', operation: 'updateOAuth2Server' }),
			),
		});
		expect(Object.keys(body(1)).sort()).toEqual(specBody('PUT /project/oauth2-server'));
	});

	it('switches an auth method, service, or protocol by its ID', async () => {
		const { requests, body } = await run({
			resource: 'project',
			operation: 'updateAuthMethod',
			authMethod: 'magic-url',
			enabled: false,
		});
		expect(requests[0].url).toBe(`${BASE_URL}/project/auth-methods/magic-url`);
		expect(body()).toEqual({ enabled: false });
	});

	it('refuses to send a test email to nobody', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'project', operation: 'sendTestEmail', testEmailRecipients: ' ' },
		});
		await expect(node.execute.call(context)).rejects.toThrow(NodeOperationError);
		expect(requests).toHaveLength(0);
	});
});

describe('Platform', () => {
	it('offers exactly the platform types Appwrite can create', () => {
		expect(PLATFORM_TYPES.map((type) => type.value).sort()).toEqual(
			specFamily('POST', '/project/platforms/'),
		);
	});

	it.each(PLATFORM_TYPES.map((type) => [type.name, type] as const))(
		'creates a %s platform with its own identifier',
		async (_name, type) => {
			const { requests, body } = await run({
				resource: 'platform',
				operation: 'create',
				platformType: type.value,
				name: 'My App',
				platformIdentifier: 'com.example.app',
				platformId: 'my-app',
			});

			expect(requests[0].url).toBe(`${BASE_URL}/project/platforms/${type.value}`);
			expect(body()).toEqual({
				platformId: 'my-app',
				name: 'My App',
				[type.identifier.body]: 'com.example.app',
			});
			expect(Object.keys(body()).sort()).toEqual(specBody(`POST /project/platforms/${type.value}`));
		},
	);

	it.each(PLATFORM_TYPES.map((type) => [type.name, type] as const))(
		'updates a %s platform, resending the setting the user did not change',
		async (_name, type) => {
			const { requests, body } = await run(
				{
					resource: 'platform',
					operation: 'update',
					platformId: { __rl: true, mode: 'id', value: 'p1' },
					platformType: type.value,
					updateFields: { name: 'Renamed' },
				},
				() => ({ $id: 'p1', type: type.value, name: 'Old', [type.identifier.body]: 'current-id' }),
			);

			expect(requests[1].method).toBe('PUT');
			expect(requests[1].url).toBe(`${BASE_URL}/project/platforms/${type.value}/p1`);
			expect(body(1)).toEqual({ name: 'Renamed', [type.identifier.body]: 'current-id' });
			expect(Object.keys(body(1)).sort()).toEqual(
				specBody(`PUT /project/platforms/${type.value}/{platformId}`),
			);
		},
	);

	it('explains which type to pick when it does not match the platform', async () => {
		const { context, requests } = createExecuteContext({
			parameters: {
				resource: 'platform',
				operation: 'update',
				platformId: { __rl: true, mode: 'id', value: 'p1' },
				platformType: 'web',
			},
			respond: () => ({ $id: 'p1', type: 'android', name: 'App' }),
		});

		await expect(node.execute.call(context)).rejects.toThrow(
			'The platform is a Android platform, not Web',
		);
		expect(requests).toHaveLength(1);
	});

	it('takes a platform from a Console link', async () => {
		const { requests } = await run({
			resource: 'platform',
			operation: 'get',
			platformId: {
				__rl: true,
				mode: 'url',
				value: 'https://cloud.appwrite.io/console/project-fra-p/overview/platforms/p1?tab=x',
			},
		});
		expect(requests[0].url).toBe(`${BASE_URL}/project/platforms/p1`);
	});
});

describe('API Key', () => {
	const current = {
		$id: 'k1',
		name: 'CI',
		scopes: ['users.read'],
		expire: '2030-01-01T00:00:00.000+00:00',
	};

	it('outputs the ephemeral key with its secret', async () => {
		const { output, body } = await run(
			{
				resource: 'apiKey',
				operation: 'createEphemeral',
				keyScopes: 'users.read, files.write',
				keyDuration: 300,
			},
			() => ({ $id: 'e1', secret: 'ephemeral_abc' }),
		);
		expect(body()).toEqual({ scopes: ['users.read', 'files.write'], duration: 300 });
		expect(output[0].json.secret).toBe('ephemeral_abc');
	});

	it('refuses to create a key without scopes', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'apiKey', operation: 'createEphemeral', keyScopes: '' },
		});
		await expect(node.execute.call(context)).rejects.toThrow(NodeOperationError);
		expect(requests).toHaveLength(0);
	});

	it('keeps the scopes and expiration date the user did not change', async () => {
		const { requests, body } = await run(
			{
				resource: 'apiKey',
				operation: 'update',
				apiKeyId: { __rl: true, mode: 'id', value: 'k1' },
				updateFields: { name: 'Deploy' },
			},
			() => current,
		);
		expect(requests.map((request) => request.method)).toEqual(['GET', 'PUT']);
		expect(body(1)).toEqual({ name: 'Deploy', scopes: ['users.read'], expire: current.expire });
	});

	it('makes a key never expire when the expiration date is added empty', async () => {
		const { body } = await run(
			{
				resource: 'apiKey',
				operation: 'update',
				apiKeyId: { __rl: true, mode: 'id', value: 'k1' },
				updateFields: { expire: '', keyScopes: 'teams.read' },
			},
			() => current,
		);
		expect(body(1)).toEqual({ name: 'CI', scopes: ['teams.read'], expire: null });
	});

	it('takes an API key from a Console link', async () => {
		const { requests } = await run({
			resource: 'apiKey',
			operation: 'get',
			apiKeyId: {
				__rl: true,
				mode: 'url',
				value: 'https://cloud.appwrite.io/console/project-fra-p/overview/api-keys/k1',
			},
		});
		expect(requests[0].url).toBe(`${BASE_URL}/project/keys/k1`);
	});
});

describe('Project Variable', () => {
	it('creates secret variables unless told otherwise', async () => {
		const { body } = await run({
			resource: 'projectVariable',
			operation: 'create',
			variableId: 'stripe-url',
			key: 'STRIPE_URL',
			value: 'https://api.stripe.com',
		});
		expect(body()).toEqual({
			variableId: 'stripe-url',
			key: 'STRIPE_URL',
			value: 'https://api.stripe.com',
			secret: true,
		});
	});

	it('refuses an update that changes nothing', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'projectVariable', operation: 'update', variableId: 'v1' },
		});
		await expect(node.execute.call(context)).rejects.toThrow('No fields to update were added');
		expect(requests).toHaveLength(0);
	});
});

describe('lists that page by offset only', () => {
	it('fetches every mock phone number page by page with Return All', async () => {
		const page = Array.from({ length: 100 }, (_, index) => ({ number: `+1206555${index}` }));
		const { output, requests } = await run(
			{ resource: 'mockPhone', operation: 'getMany', returnAll: true },
			(_request, index) => ({ mockNumbers: index === 0 ? page : page.slice(0, 3) }),
		);

		expect(output).toHaveLength(103);
		const queries = requests.map((request) =>
			Object.values(request.qs as Record<string, string>).map((query) => JSON.parse(query)),
		);
		expect(queries).toEqual([
			[
				{ method: 'limit', values: [100] },
				{ method: 'offset', values: [0] },
			],
			[
				{ method: 'limit', values: [100] },
				{ method: 'offset', values: [100] },
			],
		]);
	});

	it('reads an email template in the chosen language, or the default one', async () => {
		const german = await run({
			resource: 'emailTemplate',
			operation: 'get',
			emailTemplateType: 'recovery',
			emailTemplateLocale: 'de',
		});
		expect(german.requests[0].url).toBe(`${BASE_URL}/project/templates/email/recovery`);
		expect(german.requests[0].qs).toEqual({ locale: 'de' });

		const fallback = await run({ resource: 'emailTemplate', operation: 'get' });
		expect(fallback.requests[0].qs).toEqual({});
	});
});

describe('list search for records without a search parameter', () => {
	it('filters API keys by name or ID locally', async () => {
		const { context, requests } = createLoadOptionsContext({
			respond: () => ({
				keys: [
					{ $id: 'k1', name: 'CI deploy' },
					{ $id: 'k2', name: 'Backups' },
				],
			}),
		});

		expect(await searchApiKeys.call(context, 'ci')).toEqual({
			results: [{ name: 'CI deploy', value: 'k1' }],
			paginationToken: undefined,
		});
		expect(requests[0].url).toBe(`${BASE_URL}/project/keys`);
		expect((requests[0].qs as Record<string, string>).search).toBeUndefined();
	});

	it('lists platforms by name', async () => {
		const { context } = createLoadOptionsContext({
			respond: () => ({ platforms: [{ $id: 'p1', name: 'Website' }] }),
		});
		expect((await searchPlatforms.call(context)).results).toEqual([
			{ name: 'Website', value: 'p1' },
		]);
	});
});
