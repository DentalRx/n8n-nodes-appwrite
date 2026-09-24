import type { INodeProperties } from 'n8n-workflow';

import { webhookLocator } from './locators';
import { queriesProperties, returnAllAndLimitProperties, simplifyProperty } from './shared';

export const webhookOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['webhook'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a webhook that receives project events',
				action: 'Create webhook',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a webhook permanently',
				action: 'Delete webhook',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single webhook by its ID',
				action: 'Get webhook',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List webhooks, with optional filters',
				action: 'Get many webhooks',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the name, URL, events, or delivery settings of a webhook',
				action: 'Update webhook',
			},
			{
				name: 'Update Secret',
				value: 'updateSecret',
				description: 'Replace the key Appwrite signs deliveries with',
				action: 'Update webhook secret',
			},
		],
		default: 'get',
	},
];

const EVENTS_DESCRIPTION =
	'Events that trigger the webhook, as a comma-separated list or a JSON array. Maximum of 100 events.';

const EVENTS_PLACEHOLDER = 'e.g. users.*.create, databases.*.tables.*.rows.*.create';

const NAME_DESCRIPTION = 'The name of the webhook. Max length: 128 characters.';

const URL_DESCRIPTION = 'The HTTP or HTTPS address Appwrite sends the events to';

const URL_PLACEHOLDER = 'e.g. https://example.com/appwrite-events';

const SECRET_DESCRIPTION =
	'The key Appwrite signs each delivery with, so the receiver can verify it came from Appwrite. Leave empty to have Appwrite generate one. Between 8 and 256 characters.';

/**
 * Every setting of a webhook, sorted by label. Update offers all of them;
 * Create shows the required ones on the node's face and the rest as options.
 */
const webhookSettings: INodeProperties[] = [
	{
		displayName: 'Certificate Verification',
		name: 'tls',
		type: 'boolean',
		default: false,
		description:
			'Whether Appwrite verifies the SSL/TLS certificate of the webhook URL before delivering. Leave off only for URLs with a self-signed certificate.',
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description:
			'Whether Appwrite delivers events to the webhook. Enabling a webhook also resets its count of failed attempts.',
	},
	{
		displayName: 'Events',
		name: 'events',
		type: 'string',
		default: '',
		placeholder: EVENTS_PLACEHOLDER,
		description: EVENTS_DESCRIPTION,
	},
	{
		displayName: 'HTTP Password',
		name: 'authPassword',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		description:
			'Password Appwrite sends with each delivery using HTTP basic authentication. Leave empty for no authentication.',
	},
	{
		displayName: 'HTTP Username',
		name: 'authUsername',
		type: 'string',
		default: '',
		description:
			'Username Appwrite sends with each delivery using HTTP basic authentication. Leave empty for no authentication.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: NAME_DESCRIPTION,
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		placeholder: URL_PLACEHOLDER,
		description: URL_DESCRIPTION,
	},
];

/** Settings that Create requires, and so shows on the node's face instead. */
const REQUIRED_ON_CREATE = ['events', 'name', 'url'];

export const webhookFields: INodeProperties[] = [
	webhookLocator({
		resource: ['webhook'],
		operation: ['delete', 'get', 'update', 'updateSecret'],
	}),
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: NAME_DESCRIPTION,
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: URL_PLACEHOLDER,
		description: URL_DESCRIPTION,
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Events',
		name: 'webhookEvents',
		type: 'string',
		required: true,
		default: '',
		placeholder: EVENTS_PLACEHOLDER,
		description: EVENTS_DESCRIPTION,
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Webhook ID',
		name: 'webhookId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the webhook. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Secret',
		name: 'webhookSecret',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		description: SECRET_DESCRIPTION,
		hint: "Get and Get Many never return the secret, so keep it from this operation's output",
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['updateSecret'],
			},
		},
	},
	...returnAllAndLimitProperties('webhook', ['getMany']),
	...queriesProperties('webhook', ['getMany']),
	simplifyProperty('webhook', ['get', 'getMany']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['create'],
			},
		},
		options: [
			...webhookSettings.filter((setting) => !REQUIRED_ON_CREATE.includes(setting.name)),
			{
				displayName: 'Secret',
				name: 'webhookSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: SECRET_DESCRIPTION,
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description: 'The settings to change. Settings you do not add keep their current values.',
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['update'],
			},
		},
		options: webhookSettings,
	},
];
