import type { INodeProperties } from 'n8n-workflow';

import {
	databaseIdProperty,
	permissionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
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
				action: 'Create a row',
			},
			{
				name: 'Create Many',
				value: 'createMany',
				description: 'Create multiple rows in a single request',
				action: 'Create many rows',
			},
			{
				name: 'Decrement Column',
				value: 'decrement',
				description: 'Decrement a numeric column of a row',
				action: 'Decrement a row column',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a row',
				action: 'Delete a row',
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
				description: 'Get a row by ID',
				action: 'Get a row',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List rows, with optional filters',
				action: 'Get many rows',
			},
			{
				name: 'Increment Column',
				value: 'increment',
				description: 'Increment a numeric column of a row',
				action: 'Increment a row column',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a row',
				action: 'Update a row',
			},
			{
				name: 'Update Many',
				value: 'updateMany',
				description: 'Apply the same update to all rows that match the given queries',
				action: 'Update many rows',
			},
			{
				name: 'Upsert',
				value: 'upsert',
				description: 'Create a row or update it if it already exists',
				action: 'Upsert a row',
			},
			{
				name: 'Upsert Many',
				value: 'upsertMany',
				description: 'Create or update multiple rows in a single request',
				action: 'Upsert many rows',
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
		placeholder: 'Add Field',
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
						displayName: 'Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						description:
							'Value to set. Numbers, booleans, null, and JSON arrays/objects are parsed automatically.',
					},
					{
						displayName: 'Treat Value as String',
						name: 'treatValueAsString',
						type: 'boolean',
						default: false,
						description:
							'Whether to always send the value as a string instead of auto-detecting numbers, booleans, and arrays',
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
				operation: ['create', 'upsert'],
			},
		},
	},
	...dataProperties,
	permissionsProperty('row', ['create', 'update', 'upsert']),
	{
		displayName: 'Rows (JSON)',
		name: 'rowsJson',
		type: 'json',
		default: '[]',
		description:
			'A JSON array of row objects to create or upsert. Each object holds the column values; optionally include $id (omit it to auto-generate) and $permissions.',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['createMany', 'upsertMany'],
			},
		},
	},
	{
		displayName: 'Column',
		name: 'column',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the numeric column to change',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['increment', 'decrement'],
			},
		},
	},
	{
		displayName: 'Value',
		name: 'value',
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
		hint: 'Filter, sort, and paginate rows. For Get, only Select queries apply. For Update Many and Delete Many, the queries choose which rows are affected — no queries means ALL rows in the table.',
	}),
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
				displayName: 'Max Value',
				name: 'max',
				type: 'number',
				default: 0,
				description:
					'Maximum the column may reach when incrementing. Only used by Increment Column; 0 means no maximum.',
			},
			{
				displayName: 'Min Value',
				name: 'min',
				type: 'number',
				default: 0,
				description:
					'Minimum the column may reach when decrementing. Only used by Decrement Column; 0 means no minimum.',
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
