import type {
	IDataObject,
	IHttpRequestOptions,
	INodeParameters,
	INodeProperties,
	INodePropertyOptions,
	NodeParameterValue,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { searchProviders } from '../nodes/Appwrite/methods/listSearch';
import api from './fixtures/appwrite-api.json';
import {
	BASE_URL,
	createExecuteContext,
	createLoadOptionsContext,
	description,
	node,
} from './helpers/mock-context';

const operations = api.operations as Record<string, { body: Record<string, unknown> }>;

const providerTypeProperty = description.properties.find(
	(property) => property.name === 'providerType',
) as INodeProperties;
const providerTypeOptions = providerTypeProperty.options as INodePropertyOptions[];
const providerTypes = providerTypeOptions.map((option) => option.value as string);

/** The settings of each provider type that hold secrets, as Appwrite names them. */
const SECRETS: Record<string, string[]> = {
	apns: ['authKey'],
	appwrite: [],
	fcm: ['serviceAccountJSON'],
	mailgun: ['apiKey'],
	msg91: ['authKey'],
	resend: ['apiKey'],
	sendgrid: ['apiKey'],
	ses: ['secretKey'],
	smtp: ['password'],
	telesign: ['apiKey'],
	textmagic: ['apiKey'],
	twilio: ['authToken'],
	vonage: ['apiKey', 'apiSecret'],
};

const SERVICE_ACCOUNT = { type: 'service_account', project_id: 'demo' };

/** The Create Options or Update Fields collection shown for one provider type. */
function settingsOf(operation: 'create' | 'update', providerType: string): INodeProperties[] {
	const name = operation === 'create' ? 'options' : 'updateFields';
	const collection = description.properties.find((property) => {
		const show = property.displayOptions?.show ?? {};
		return (
			property.name === name &&
			(show.resource as string[] | undefined)?.includes('provider') &&
			(show.operation as string[] | undefined)?.includes(operation) &&
			(show.providerType as string[] | undefined)?.includes(providerType)
		);
	});
	return (collection?.options ?? []) as INodeProperties[];
}

/** A value for a setting that differs from its default, so the setting is really sent. */
function sampleValue(setting: INodeProperties): NodeParameterValue {
	if (setting.name === 'serviceAccountJSON') return JSON.stringify(SERVICE_ACCOUNT);
	switch (setting.type) {
		case 'boolean':
			return !(setting.default as boolean);
		case 'number':
			return 60;
		case 'options':
			return (setting.options as INodePropertyOptions[]).find(
				(option) => option.value !== setting.default,
			)?.value as string;
		default:
			return `${setting.name}-value`;
	}
}

/** Every setting of a collection, filled in. */
function fillAll(settings: INodeProperties[]): INodeParameters {
	return Object.fromEntries(settings.map((setting) => [setting.name, sampleValue(setting)]));
}

const createParameters = (providerType: string, options: INodeParameters): INodeParameters => ({
	resource: 'provider',
	operation: 'create',
	providerType,
	name: 'Primary',
	providerId: 'primary',
	smtpHost: 'smtp.example.com',
	options,
});

const updateParameters = (
	providerType: string,
	updateFields: INodeParameters,
): INodeParameters => ({
	resource: 'provider',
	operation: 'update',
	providerType,
	providerId: { __rl: true, mode: 'id', value: 'p1' },
	updateFields,
});

/** Run the node once and return the one request it sent. */
async function send(parameters: INodeParameters): Promise<IHttpRequestOptions> {
	const { context, requests } = createExecuteContext({
		parameters,
		respond: () => ({ $id: 'p1' }),
	});
	await node.execute.call(context);
	expect(requests).toHaveLength(1);
	return requests[0];
}

const bodyOf = (request: IHttpRequestOptions): IDataObject => request.body as IDataObject;
const sortedKeys = (data: object): string[] => Object.keys(data).sort();

describe('Provider types', () => {
	it('offer one type per provider endpoint Appwrite documents', () => {
		const documented = Object.keys(operations)
			.map((key) => /^POST \/messaging\/providers\/([a-z0-9]+)$/.exec(key)?.[1])
			.filter((segment): segment is string => segment !== undefined);
		expect([...providerTypes].sort()).toEqual(documented.sort());
		expect(sortedKeys(SECRETS)).toEqual([...providerTypes].sort());
	});

	it('are listed alphabetically by name', () => {
		const names = providerTypeOptions.map((option) => option.name);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
	});
});

describe.each(providerTypes)('provider type "%s"', (providerType) => {
	const createPath = `/messaging/providers/${providerType}`;
	const updatePath = `${createPath}/{providerId}`;

	it('creates with exactly the body fields Appwrite documents', async () => {
		const request = await send(
			createParameters(providerType, fillAll(settingsOf('create', providerType))),
		);

		expect(request.method).toBe('POST');
		expect(request.url).toBe(`${BASE_URL}${createPath}`);
		expect(sortedKeys(bodyOf(request))).toEqual(sortedKeys(operations[`POST ${createPath}`].body));
		expect(bodyOf(request)).toMatchObject({ providerId: 'primary', name: 'Primary' });
	});

	it('updates with exactly the body fields Appwrite documents', async () => {
		const request = await send(
			updateParameters(providerType, fillAll(settingsOf('update', providerType))),
		);

		expect(request.method).toBe('PATCH');
		expect(request.url).toBe(`${BASE_URL}${createPath}/p1`);
		expect(sortedKeys(bodyOf(request))).toEqual(sortedKeys(operations[`PATCH ${updatePath}`].body));
	});

	it.each(['create', 'update'] as const)(
		'masks exactly its secrets on %s and sends them unchanged',
		async (operation) => {
			const settings = settingsOf(operation, providerType);
			const masked = settings
				.filter((setting) => setting.typeOptions?.password === true)
				.map((setting) => setting.name);
			expect(masked.sort()).toEqual([...SECRETS[providerType]].sort());

			const values = Object.fromEntries(
				SECRETS[providerType].map((name) => [
					name,
					name === 'serviceAccountJSON' ? JSON.stringify(SERVICE_ACCOUNT) : `${name}-secret`,
				]),
			);
			const request = await send(
				operation === 'create'
					? createParameters(providerType, values)
					: updateParameters(providerType, values),
			);
			for (const name of SECRETS[providerType]) {
				expect(bodyOf(request)[name]).toEqual(
					name === 'serviceAccountJSON' ? SERVICE_ACCOUNT : `${name}-secret`,
				);
			}
		},
	);
});

describe('Provider create', () => {
	it('sends the SMTP host from the node face', async () => {
		const request = await send(createParameters('smtp', {}));
		expect(bodyOf(request)).toEqual({
			providerId: 'primary',
			name: 'Primary',
			host: 'smtp.example.com',
		});
	});

	it('generates a provider ID when none is given', async () => {
		const request = await send({ ...createParameters('sendgrid', {}), providerId: '' });
		expect(bodyOf(request).providerId).toMatch(/^[0-9a-f]{20}$/);
	});

	it('always sets the Mailgun region, so Appwrite can enable the provider', async () => {
		const us = await send(createParameters('mailgun', { apiKey: 'key', enabled: true }));
		expect(bodyOf(us)).toMatchObject({ isEuRegion: false, apiKey: 'key', enabled: true });

		const eu = await send(createParameters('mailgun', { isEuRegion: true }));
		expect(bodyOf(eu).isEuRegion).toBe(true);
	});

	it('leaves empty text out of the request', async () => {
		const request = await send(
			createParameters('resend', { apiKey: 'key', fromEmail: '', fromName: '' }),
		);
		expect(bodyOf(request)).toEqual({ providerId: 'primary', name: 'Primary', apiKey: 'key' });
	});

	it('accepts the FCM service account as an object from an expression', async () => {
		const request = await send(createParameters('fcm', { serviceAccountJSON: SERVICE_ACCOUNT }));
		expect(bodyOf(request).serviceAccountJSON).toEqual(SERVICE_ACCOUNT);
	});

	it('stops on a service account that is not JSON, before sending anything', async () => {
		const { context, requests } = createExecuteContext({
			parameters: createParameters('fcm', { serviceAccountJSON: 'not json' }),
		});
		await expect(node.execute.call(context)).rejects.toThrow(NodeOperationError);
		expect(requests).toHaveLength(0);
	});

	it('stops on an unknown provider type, before sending anything', async () => {
		const { context, requests } = createExecuteContext({
			parameters: createParameters('../users', {}),
		});
		await expect(node.execute.call(context)).rejects.toThrow('Unknown provider type "../users"');
		expect(requests).toHaveLength(0);
	});
});

describe('Provider update', () => {
	it('sends only the fields that were set', async () => {
		const request = await send(updateParameters('twilio', { authToken: 'new-token' }));
		expect(request.url).toBe(`${BASE_URL}/messaging/providers/twilio/p1`);
		expect(bodyOf(request)).toEqual({ authToken: 'new-token' });
	});

	it('sends nothing for fields added but left empty', async () => {
		const request = await send(
			updateParameters('sendgrid', { name: 'Renamed', fromEmail: '', replyToName: '' }),
		);
		expect(bodyOf(request)).toEqual({ name: 'Renamed' });
	});

	it('sends the SMTP host and encryption from Update Fields', async () => {
		const request = await send(
			updateParameters('smtp', { host: 'smtp2.example.com', encryption: 'tls', port: 465 }),
		);
		expect(bodyOf(request)).toEqual({ host: 'smtp2.example.com', encryption: 'tls', port: 465 });
	});

	it.each([
		['atMostOnce', 0],
		['atLeastOnce', 1],
		// An explicit null hands the choice back to each subscriber.
		['subscriber', null],
	])('sends delivery guarantee %s as QoS %s', async (qos, level) => {
		const request = await send(updateParameters('appwrite', { qos }));
		expect(bodyOf(request)).toEqual({ qos: level });
	});
});

describe('Provider get, delete and get many', () => {
	it('reads a provider picked from the list or by Console URL', async () => {
		const request = await send({
			resource: 'provider',
			operation: 'get',
			providerId: {
				__rl: true,
				mode: 'url',
				value: 'https://cloud.appwrite.io/console/project-fra-p/messaging/providers/provider-mail',
			},
		});
		expect(request.method).toBe('GET');
		expect(request.url).toBe(`${BASE_URL}/messaging/providers/mail`);
	});

	it('confirms a delete with the deleted ID', async () => {
		const { context, requests } = createExecuteContext({
			parameters: {
				resource: 'provider',
				operation: 'delete',
				providerId: { __rl: true, mode: 'id', value: 'mail' },
			},
		});
		const [output] = await node.execute.call(context);
		expect(requests[0].method).toBe('DELETE');
		expect(requests[0].url).toBe(`${BASE_URL}/messaging/providers/mail`);
		expect(output.map((item) => item.json)).toEqual([{ deleted: true, providerId: 'mail' }]);
	});

	it('lists providers matching a search term', async () => {
		const { context, requests } = createExecuteContext({
			parameters: {
				resource: 'provider',
				operation: 'getMany',
				limit: 5,
				options: { search: 'mail' },
			},
			respond: () => ({ total: 2, providers: [{ $id: 'a' }, { $id: 'b' }] }),
		});
		const [output] = await node.execute.call(context);
		expect(requests[0].url).toBe(`${BASE_URL}/messaging/providers`);
		expect((requests[0].qs as IDataObject).search).toBe('mail');
		expect(output.map((item) => item.json)).toEqual([{ $id: 'a' }, { $id: 'b' }]);
	});
});

describe('provider list search', () => {
	it('lists providers by name and passes the filter to Appwrite', async () => {
		const { context, requests } = createLoadOptionsContext({
			respond: () => ({ providers: [{ $id: 'p1', name: 'Transactional Email' }] }),
		});
		expect((await searchProviders.call(context, 'email')).results).toEqual([
			{ name: 'Transactional Email', value: 'p1' },
		]);
		expect(requests[0].url).toBe(`${BASE_URL}/messaging/providers`);
		expect((requests[0].qs as IDataObject).search).toBe('email');
	});
});
