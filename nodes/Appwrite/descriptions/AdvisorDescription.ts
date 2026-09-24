import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties, simplifyProperty } from './shared';

export const advisorOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['advisor'],
			},
		},
		options: [
			{
				name: 'Delete Report',
				value: 'deleteReport',
				description: 'Delete a report and the insights it produced',
				action: 'Delete advisor report',
			},
			{
				name: 'Get Insight',
				value: 'getInsight',
				description: 'Retrieve a single insight of a report by its ID',
				action: 'Get advisor insight',
			},
			{
				name: 'Get Many Insights',
				value: 'getManyInsights',
				description: 'List the insights of a report, with optional filters',
				action: 'Get many advisor insights',
			},
			{
				name: 'Get Many Reports',
				value: 'getManyReports',
				description: 'List analysis reports, with optional filters',
				action: 'Get many advisor reports',
			},
			{
				name: 'Get Report',
				value: 'getReport',
				description: 'Retrieve a single report, with its insights, by its ID',
				action: 'Get advisor report',
			},
		],
		default: 'getManyReports',
	},
];

export const advisorFields: INodeProperties[] = [
	{
		displayName: 'Report ID',
		name: 'reportId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the analysis report',
		displayOptions: {
			show: {
				resource: ['advisor'],
				operation: ['deleteReport', 'getInsight', 'getManyInsights', 'getReport'],
			},
		},
	},
	{
		displayName: 'Insight ID',
		name: 'insightId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the insight',
		displayOptions: {
			show: {
				resource: ['advisor'],
				operation: ['getInsight'],
			},
		},
	},
	...returnAllAndLimitProperties('advisor', ['getManyInsights', 'getManyReports']),
	...queriesProperties('advisor', ['getManyInsights', 'getManyReports']),
	simplifyProperty('advisor', ['getInsight', 'getManyInsights', 'getManyReports', 'getReport']),
];
