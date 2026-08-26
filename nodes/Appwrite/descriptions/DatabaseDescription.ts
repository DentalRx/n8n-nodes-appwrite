import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties } from './shared';

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
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the database',
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
		description: 'The database name. Max length: 128 chars.',
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
			'Whether the database is enabled. When disabled, users cannot access it, but server SDKs with an API key still can.',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Search',
		name: 'search',
		type: 'string',
		default: '',
		description: 'Search term to filter the database list',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['getMany'],
			},
		},
	},
	...returnAllAndLimitProperties('database', ['getMany']),
	...queriesProperties('database', ['getMany']),
];
