import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties } from './shared';

export const transactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['transaction'],
			},
		},
		options: [
			{
				name: 'Commit',
				value: 'commit',
				description: 'Commit a transaction, applying all its staged operations',
				action: 'Commit a transaction',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Start a new database transaction',
				action: 'Create a transaction',
			},
			{
				name: 'Create Operations',
				value: 'createOperations',
				description: 'Stage additional operations inside an open transaction',
				action: 'Create transaction operations',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a transaction without applying it',
				action: 'Delete a transaction',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a transaction by ID',
				action: 'Get a transaction',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List transactions across all databases',
				action: 'Get many transactions',
			},
			{
				name: 'Rollback',
				value: 'rollback',
				description: 'Roll back a transaction, discarding all its staged operations',
				action: 'Roll back a transaction',
			},
		],
		default: 'create',
	},
];

export const transactionFields: INodeProperties[] = [
	{
		displayName: 'Transaction ID',
		name: 'transactionId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID returned by the Create operation when the transaction was started',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['get', 'commit', 'rollback', 'delete', 'createOperations'],
			},
		},
	},
	{
		displayName: 'TTL (Seconds)',
		name: 'ttl',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 300,
		description:
			'Number of seconds before the transaction expires. Appwrite rejects a value outside the range its deployment allows.',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Operations (JSON)',
		name: 'operationsJson',
		type: 'json',
		required: true,
		default: '[]',
		placeholder:
			'[{"action": "create", "databaseId": "main", "tableId": "posts", "rowId": "unique()", "data": {"title": "Hello"}}]',
		description:
			'A JSON array of operations to stage in the transaction. Each entry describes an action (e.g. create, update, delete) with its databaseId, tableId, rowId, and data.',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['createOperations'],
			},
		},
	},
	...returnAllAndLimitProperties('transaction', ['getMany']),
	...queriesProperties('transaction', ['getMany']),
];
