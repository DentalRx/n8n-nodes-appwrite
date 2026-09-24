import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties } from './shared';

export const presenceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['presence'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a presence entry, marking the user as no longer present',
				action: 'Delete presence',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single presence entry by its ID',
				action: 'Get presence',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List current presence entries, with optional filters',
				action: 'Get many presences',
			},
		],
		default: 'getMany',
	},
];

export const presenceFields: INodeProperties[] = [
	{
		displayName: 'Presence ID',
		name: 'presenceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the presence entry. Expired entries count as not found.',
		displayOptions: {
			show: {
				resource: ['presence'],
				operation: ['delete', 'get'],
			},
		},
	},
	...returnAllAndLimitProperties('presence', ['getMany']),
	...queriesProperties('presence', ['getMany']),
];
