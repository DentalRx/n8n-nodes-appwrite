import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties, simplifyProperty } from './shared';

export const activityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['activity'],
			},
		},
		options: [
			{
				name: 'Get Event',
				value: 'getEvent',
				description: 'Retrieve a single audit trail event by its ID',
				action: 'Get activity event',
			},
			{
				name: 'Get Many Events',
				value: 'getManyEvents',
				description: 'List audit trail events, with optional filters',
				action: 'Get many activity events',
			},
		],
		default: 'getManyEvents',
	},
];

export const activityFields: INodeProperties[] = [
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the audit trail event',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['getEvent'],
			},
		},
	},
	...returnAllAndLimitProperties('activity', ['getManyEvents']),
	...queriesProperties('activity', ['getManyEvents'], {
		hint: "Filter on columns such as userId or teamId, e.g. Equal on userId for one user's activity",
	}),
	simplifyProperty('activity', ['getEvent', 'getManyEvents']),
];
