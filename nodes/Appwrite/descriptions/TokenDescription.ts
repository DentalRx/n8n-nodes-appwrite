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
		displayName: 'Bucket Name or ID',
		name: 'bucketId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getBuckets' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		displayName: 'Expiry Date',
		name: 'expire',
		type: 'dateTime',
		default: '',
		description: 'When the token stops working. Leave empty to create a token that never expires.',
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
