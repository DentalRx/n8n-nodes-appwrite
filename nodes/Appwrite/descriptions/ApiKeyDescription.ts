import type { INodeProperties } from 'n8n-workflow';

import { apiKeyLocator } from './locators';
import { queriesProperties, returnAllAndLimitProperties } from './shared';

export const apiKeyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['apiKey'],
			},
		},
		options: [
			{
				name: 'Create Ephemeral Key',
				value: 'createEphemeral',
				description:
					"Create a temporary API key that works for up to an hour. The output includes the key's secret, to use in later requests.",
				action: 'Create ephemeral API key',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an API key permanently, so requests made with it are refused',
				action: 'Delete API key',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an API key, including its secret and scopes',
				action: 'Get API key',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: "Retrieve a list of the project's API keys, including their secrets",
				action: 'Get many API keys',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Rename an API key or change its scopes or expiration date',
				action: 'Update API key',
			},
		],
		default: 'get',
	},
];

export const apiKeyFields: INodeProperties[] = [
	apiKeyLocator({ resource: ['apiKey'], operation: ['delete', 'get', 'update'] }),
	{
		displayName: 'Scopes',
		name: 'keyScopes',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. users.read, files.write',
		description:
			'The permissions the key grants, as a comma-separated list or a JSON array of scopes such as users.read or files.write. Up to 200.',
		displayOptions: {
			show: {
				resource: ['apiKey'],
				operation: ['createEphemeral'],
			},
		},
	},
	{
		displayName: 'Lifetime (Seconds)',
		name: 'keyDuration',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 3600 },
		required: true,
		default: 600,
		description: 'How long the key works, in seconds, up to one hour (3600)',
		displayOptions: {
			show: {
				resource: ['apiKey'],
				operation: ['createEphemeral'],
			},
		},
	},
	...returnAllAndLimitProperties('apiKey', ['getMany']),
	...queriesProperties('apiKey', ['getMany'], {
		hint: 'You can filter on name, scopes, expire, and accessedAt',
	}),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description: 'The settings to change. Settings you do not add keep their current values.',
		displayOptions: {
			show: {
				resource: ['apiKey'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Expiration Date',
				name: 'expire',
				type: 'dateTime',
				default: '',
				description: 'When the key stops working. Leave empty for a key that never expires.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the key. Max length: 128 characters.',
			},
			{
				displayName: 'Scopes',
				name: 'keyScopes',
				type: 'string',
				default: '',
				placeholder: 'e.g. users.read, files.write',
				description:
					'The permissions the key grants, as a comma-separated list or a JSON array of scopes such as users.read or files.write. Replaces all current scopes.',
			},
		],
	},
];
