import type { INodeProperties } from 'n8n-workflow';

import {
	databaseIdProperty,
	listOptionsProperty,
	permissionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
} from './shared';

export const tableOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['table'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new table (formerly known as a collection)',
				action: 'Create a table',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a table and all its rows',
				action: 'Delete a table',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a table by ID',
				action: 'Get a table',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List tables in a database',
				action: 'Get many tables',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a table',
				action: 'Update a table',
			},
		],
		default: 'getMany',
	},
];

export const tableFields: INodeProperties[] = [
	databaseIdProperty(['table']),
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: { loadOptionsDependsOn: ['databaseId'], loadOptionsMethod: 'getTables' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the new table. Leave empty (or use unique()) to auto-generate a unique ID.',
		displayOptions: {
			show: {
				resource: ['table'],
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
		description: 'Name for the table, up to 128 characters',
		displayOptions: {
			show: {
				resource: ['table'],
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
			'Whether the table is enabled. When disabled, users cannot access it, but server SDKs with an API key still can. Defaults to true.',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['create'],
			},
		},
	},
	permissionsProperty(
		'table',
		['create', 'update'],
		'Default permissions for rows in this table, one permission string per line (or a JSON array). E.g. read("any"), create("users"). Row-level permissions apply on top when Row Security is enabled.',
	),
	{
		displayName: 'Row Security',
		name: 'rowSecurity',
		type: 'boolean',
		default: false,
		description:
			'Whether to enable row-level security. When enabled, users can access rows they have been granted permission to, in addition to the table-level permissions. Defaults to false.',
		displayOptions: {
			show: {
				resource: ['table'],
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
				resource: ['table'],
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
					'Whether the table is enabled. When disabled, users cannot access it, but server SDKs with an API key still can. Leave this out to keep the current setting.',
			},
			{
				displayName: 'Row Security',
				name: 'rowSecurity',
				type: 'boolean',
				default: false,
				description:
					'Whether to enable row-level security. When enabled, users can access rows they have been granted permission to, in addition to the table-level permissions. Leave this out to keep the current setting.',
			},
		],
	},
	...returnAllAndLimitProperties('table', ['getMany']),
	...queriesProperties('table', ['getMany']),
	listOptionsProperty('table', ['getMany']),
];
