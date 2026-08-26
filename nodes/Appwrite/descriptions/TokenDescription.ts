import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties } from './shared';

export const tokenOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['token'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new file token',
				action: 'Create a token',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a token',
				action: 'Delete a token',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a token by ID',
				action: 'Get a token',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List the tokens created for a file, with optional filters',
				action: 'Get many tokens',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update the expiry date of a token',
				action: 'Update a token',
			},
		],
		default: 'get',
	},
];

export const tokenFields: INodeProperties[] = [
	{
		displayName: 'Bucket ID',
		name: 'bucketId',
		type: 'string',
		required: true,
		default: '',
		description: 'The unique ID of the storage bucket',
		displayOptions: {
			show: {
				resource: ['token'],
				operation: ['create', 'getMany'],
			},
		},
	},
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		default: '',
		description: 'The unique ID of the file',
		displayOptions: {
			show: {
				resource: ['token'],
				operation: ['create', 'getMany'],
			},
		},
	},
	{
		displayName: 'Token ID',
		name: 'tokenId',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The unique ID of the token',
		displayOptions: {
			show: {
				resource: ['token'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},
	{
		displayName: 'Expire',
		name: 'expire',
		type: 'string',
		default: '',
		placeholder: '2030-01-01T00:00:00.000Z',
		description:
			'The token expiry date as an ISO 8601 datetime string. Leave empty for a token that never expires.',
		displayOptions: {
			show: {
				resource: ['token'],
				operation: ['create', 'update'],
			},
		},
	},
	...returnAllAndLimitProperties('token', ['getMany']),
	...queriesProperties('token', ['getMany']),
];
