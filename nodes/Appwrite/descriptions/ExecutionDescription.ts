import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties } from './shared';

export const executionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['execution'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Trigger a function execution',
				action: 'Create an execution',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a function execution log',
				action: 'Delete an execution',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a function execution log by ID',
				action: 'Get an execution',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List the executions of a function, with optional filters',
				action: 'Get many executions',
			},
		],
		default: 'create',
	},
];

export const executionFields: INodeProperties[] = [
	{
		displayName: 'Function ID',
		name: 'functionId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the function',
		displayOptions: {
			show: {
				resource: ['execution'],
			},
		},
	},
	{
		displayName: 'Execution ID',
		name: 'executionId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the execution',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['delete', 'get'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'The HTTP body of the execution. Leave empty for no body.',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Async',
		name: 'async',
		type: 'boolean',
		default: false,
		description: 'Whether to run the function asynchronously instead of waiting for the result',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['create'],
			},
		},
	},
	...returnAllAndLimitProperties('execution', ['getMany']),
	...queriesProperties('execution', ['getMany']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'json',
				default: '{}',
				description: 'HTTP headers of the execution as a JSON object',
			},
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'DELETE', value: 'DELETE' },
					{ name: 'GET', value: 'GET' },
					{ name: 'HEAD', value: 'HEAD' },
					{ name: 'OPTIONS', value: 'OPTIONS' },
					{ name: 'PATCH', value: 'PATCH' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
				],
				default: 'POST',
				description: 'HTTP method of the execution',
			},
			{
				displayName: 'Path',
				name: 'xpath',
				type: 'string',
				default: '/',
				description: 'HTTP path of the execution. The path can include query params.',
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'string',
				default: '',
				placeholder: '2026-01-01T12:00:00Z',
				description:
					'Scheduled execution time in ISO 8601 format. Must be in the future, with precision in minutes. Requires Async to be enabled.',
			},
		],
	},
];
