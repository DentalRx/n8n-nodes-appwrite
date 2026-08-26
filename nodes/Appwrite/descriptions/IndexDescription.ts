import type { INodeProperties } from 'n8n-workflow';

import {
	databaseIdProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	tableIdProperty,
} from './shared';

export const indexOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['index'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an index on a table',
				action: 'Create an index',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an index',
				action: 'Delete an index',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an index by key',
				action: 'Get an index',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List the indexes of a table',
				action: 'Get many indexes',
			},
		],
		default: 'getMany',
	},
];

export const indexFields: INodeProperties[] = [
	databaseIdProperty(['index']),
	tableIdProperty(['index']),
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		required: true,
		default: '',
		description: 'The key (name) of the index',
		displayOptions: {
			show: {
				resource: ['index'],
				operation: ['create', 'get', 'delete'],
			},
		},
	},
	{
		displayName: 'Index Type',
		name: 'indexType',
		type: 'options',
		options: [
			{
				name: 'Fulltext',
				value: 'fulltext',
				description: 'Enables Search queries on the indexed columns',
			},
			{
				name: 'Key',
				value: 'key',
				description: 'A plain index to speed up queries',
			},
			{
				name: 'Spatial',
				value: 'spatial',
				description: 'An index for point, line, and polygon columns',
			},
			{
				name: 'Unique',
				value: 'unique',
				description: 'Rejects duplicate values in the indexed columns',
			},
		],
		default: 'key',
		description: 'The type of the index',
		displayOptions: {
			show: {
				resource: ['index'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'status,createdAt',
		description: 'The columns to index, comma-separated (or a JSON array of strings)',
		displayOptions: {
			show: {
				resource: ['index'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Orders',
		name: 'orders',
		type: 'string',
		default: '',
		placeholder: 'ASC,DESC',
		description:
			'The sort order for each indexed column, comma-separated (ASC or DESC, or a JSON array). Leave empty for the default order.',
		displayOptions: {
			show: {
				resource: ['index'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Lengths',
		name: 'lengths',
		type: 'string',
		default: '',
		placeholder: '128,256',
		description:
			'The maximum indexed length for each column, comma-separated numbers (or a JSON array). Leave empty for defaults.',
		displayOptions: {
			show: {
				resource: ['index'],
				operation: ['create'],
			},
		},
	},
	...returnAllAndLimitProperties('index', ['getMany']),
	...queriesProperties('index', ['getMany']),
];
