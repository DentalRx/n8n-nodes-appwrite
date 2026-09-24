import type { INodeProperties } from 'n8n-workflow';

export const graphqlOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['graphql'],
			},
		},
		options: [
			{
				name: 'Execute Mutation',
				value: 'executeMutation',
				description: "Run a GraphQL mutation against the project's API",
				action: 'Execute mutation',
			},
			{
				name: 'Execute Query',
				value: 'executeQuery',
				description: "Run a GraphQL query against the project's API",
				action: 'Execute query',
			},
		],
		default: 'executeQuery',
	},
];

export const graphqlFields: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'graphqlQuery',
		type: 'string',
		typeOptions: { rows: 6 },
		required: true,
		default: '',
		placeholder: 'e.g. query { usersList { total users { _id name email } } }',
		description:
			'The GraphQL query to run. Appwrite names fields after the REST API, with $ replaced by _ (e.g. _id).',
		displayOptions: {
			show: {
				resource: ['graphql'],
				operation: ['executeQuery'],
			},
		},
	},
	{
		displayName: 'Mutation',
		name: 'graphqlQuery',
		type: 'string',
		typeOptions: { rows: 6 },
		required: true,
		default: '',
		placeholder: 'e.g. mutation { teamsCreate(teamId: "unique()", name: "Editors") { _id name } }',
		description:
			'The GraphQL mutation to run. Appwrite names fields after the REST API, with $ replaced by _ (e.g. _id).',
		displayOptions: {
			show: {
				resource: ['graphql'],
				operation: ['executeMutation'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['graphql'],
				operation: ['executeMutation', 'executeQuery'],
			},
		},
		options: [
			{
				displayName: 'Operation Name',
				name: 'operationName',
				type: 'string',
				default: '',
				placeholder: 'e.g. ListUsers',
				description:
					'Which named operation to run, when the document defines more than one. Leave empty when it defines only one.',
			},
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '{}',
				placeholder: 'e.g. {"teamId": "editors"}',
				description:
					'Values for the variables the document declares, as a JSON object keyed by variable name without the $',
			},
		],
	},
];
