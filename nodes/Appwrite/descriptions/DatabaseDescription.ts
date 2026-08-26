import type { INodeProperties } from 'n8n-workflow';

import { listOptionsProperty, queriesProperties, returnAllAndLimitProperties } from './shared';

export const databaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['database'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new database',
				action: 'Create a database',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a database and all its tables',
				action: 'Delete a database',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a database by ID',
				action: 'Get a database',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List databases in the project',
				action: 'Get many databases',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a database',
				action: 'Update a database',
			},
		],
		default: 'getMany',
	},
];

export const databaseFields: INodeProperties[] = [
	{
		displayName: 'Database Name or ID',
		name: 'databaseId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDatabases' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the new database. Leave empty (or use unique()) to auto-generate a unique ID.',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name for the database, up to 128 characters',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description:
			'Whether the database is enabled. When disabled, users cannot access it, but server SDKs with an API key still can. Defaults to true.',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description:
					'Whether the database is enabled. When disabled, users cannot access it, but server SDKs with an API key still can. Leave this out to keep the current setting.',
			},
		],
	},
	...returnAllAndLimitProperties('database', ['getMany']),
	...queriesProperties('database', ['getMany']),
	listOptionsProperty('database', ['getMany']),
];
