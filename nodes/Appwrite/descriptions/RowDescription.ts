import type { INodeProperties } from 'n8n-workflow';

import {
	databaseIdProperty,
	permissionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	sortProperty,
	tableIdProperty,
} from './shared';

export const rowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['row'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new row (formerly known as a document)',
				action: 'Create row',
			},
			{
				name: 'Create Many',
				value: 'createMany',
				description: 'Create multiple rows in a single request',
				action: 'Create many rows',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new row, or update the current one if it already exists (upsert)',
				action: 'Create or update row',
			},
			{
				name: 'Create or Update Many',
				value: 'upsertMany',
				description: 'Create or update multiple rows in a single request (upsert)',
				action: 'Create or update many rows',
			},
			{
				name: 'Decrement Column',
				value: 'decrement',
				description: 'Decrement a numeric column of a row',
				action: 'Decrement row column',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a row permanently',
				action: 'Delete row',
			},
			{
				name: 'Delete Many',
				value: 'deleteMany',
				description: 'Delete all rows that match the given queries',
				action: 'Delete many rows',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single row by its ID',
				action: 'Get row',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve a list of rows, with optional filters',
				action: 'Get many rows',
			},
			{
				name: 'Increment Column',
				value: 'increment',
				description: 'Increment a numeric column of a row',
				action: 'Increment row column',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the column values of an existing row',
				action: 'Update row',
			},
			{
				name: 'Update Many',
				value: 'updateMany',
				description: 'Apply the same update to all rows that match the given queries',
				action: 'Update many rows',
			},
		],
		default: 'get',
	},
];

const dataProperties: INodeProperties[] = [
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Define Fields Below',
				value: 'fields',
				description: 'Set each column value individually',
			},
			{
				name: 'JSON',
				value: 'json',
				description: 'Provide the row data as a JSON object',
			},
		],
		default: 'fields',
		description: 'How to specify the row data',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create', 'update', 'upsert', 'updateMany'],
			},
		},
	},
	{
		displayName: 'Fields',
		name: 'dataFieldsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add field',
		default: {},
		description: 'The column values to set on the row',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create', 'update', 'upsert', 'updateMany'],
				dataMode: ['fields'],
			},
		},
		options: [
			{
				name: 'fieldValues',
				displayName: 'Field',
				values: [
					{
						displayName: 'Column',
						name: 'fieldName',
						type: 'string',
						default: '',
						description: 'Name of the column to set',
					},
					{
						displayName: 'Treat Value as String',
						name: 'treatValueAsString',
						type: 'boolean',
						default: false,
						description:
							'Whether to always send the value as a string instead of auto-detecting numbers, booleans, and arrays',
					},
					{
						displayName: 'Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						description:
							'Value to set. Numbers, booleans, null, and JSON arrays/objects are parsed automatically.',
					},
				],
			},
		],
	},
	{
		displayName: 'Data (JSON)',
		name: 'dataJson',
		type: 'json',
		default: '{}',
		description: 'The row data as a JSON object of column-value pairs',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create', 'update', 'upsert', 'updateMany'],
				dataMode: ['json'],
			},
		},
	},
];

export const rowFields: INodeProperties[] = [
	databaseIdProperty(['row']),
	tableIdProperty(['row']),
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the row (formerly known as a document)',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['get', 'update', 'delete', 'increment', 'decrement'],
			},
		},
	},
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the row. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		hint: 'Create or Update needs the ID of an existing row. An auto-generated ID always creates a new row.',
		description:
			'The ID for the row. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['upsert'],
			},
		},
	},
	...dataProperties,
	permissionsProperty('row', ['create', 'update', 'upsert']),
	{
		displayName: 'Rows (JSON)',
		name: 'rowsJson',
		type: 'json',
		required: true,
		default: '[]',
		placeholder: 'e.g. [{"title": "Hello", "status": "draft"}]',
		hint: 'Add "$id" to set a row\'s own ID (omit it to auto-generate one) and "$permissions" to set its permissions',
		description:
			"A JSON array of row objects to create or upsert. Each object holds the column values, and may also carry Appwrite's reserved keys for the row ID and its permissions.",
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['createMany', 'upsertMany'],
			},
		},
	},
	{
		displayName: 'Column Name or ID',
		name: 'column',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['databaseId', 'tableId'],
			loadOptionsMethod: 'getColumns',
		},
		required: true,
		default: '',
		description:
			'The numeric column to change. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['increment', 'decrement'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 1,
		description: 'The amount to change the column by',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['increment', 'decrement'],
			},
		},
	},
	...returnAllAndLimitProperties('row', ['getMany']),
	...queriesProperties('row', ['getMany', 'get', 'updateMany', 'deleteMany'], {
		hint: 'Get uses only Select queries. For Update Many and Delete Many the queries choose which rows are affected, and no queries means every row in the table.',
	}),
	sortProperty('row', ['getMany']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['row'],
			},
		},
		options: [
			{
				displayName: 'Maximum',
				name: 'max',
				type: 'number',
				default: 0,
				description: 'Maximum the column may reach; leave this option out for no maximum',
				displayOptions: { show: { '/operation': ['increment'] } },
			},
			{
				displayName: 'Minimum',
				name: 'min',
				type: 'number',
				default: 0,
				description: 'Minimum the column may reach; leave this option out for no minimum',
				displayOptions: { show: { '/operation': ['decrement'] } },
			},
			{
				displayName: 'Transaction ID',
				name: 'transactionId',
				type: 'string',
				default: '',
				description: 'Run this operation as part of an existing database transaction',
			},
		],
	},
];
