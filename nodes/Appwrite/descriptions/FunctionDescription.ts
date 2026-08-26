import type { INodeProperties } from 'n8n-workflow';

import { listOptionsProperty, queriesProperties, returnAllAndLimitProperties } from './shared';

export const functionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['function'],
			},
		},
		options: [
			{
				name: 'Activate Deployment',
				value: 'activateDeployment',
				description: 'Set the code deployment the function serves',
				action: 'Activate a function deployment',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new function',
				action: 'Create a function',
			},
			{
				name: 'Create Variable',
				value: 'createVariable',
				description: 'Create a new environment variable for a function',
				action: 'Create a function variable',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a function',
				action: 'Delete a function',
			},
			{
				name: 'Delete Deployment',
				value: 'deleteDeployment',
				description: 'Delete a code deployment of a function',
				action: 'Delete a function deployment',
			},
			{
				name: 'Delete Variable',
				value: 'deleteVariable',
				description: 'Delete an environment variable of a function',
				action: 'Delete a function variable',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a function by ID',
				action: 'Get a function',
			},
			{
				name: 'Get Deployment',
				value: 'getDeployment',
				description: 'Get a code deployment of a function by ID',
				action: 'Get a function deployment',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List functions, with optional filters',
				action: 'Get many functions',
			},
			{
				name: 'Get Many Deployments',
				value: 'getManyDeployments',
				description: 'List the code deployments of a function',
				action: 'Get many function deployments',
			},
			{
				name: 'Get Many Variables',
				value: 'getManyVariables',
				description: 'List the environment variables of a function',
				action: 'Get many function variables',
			},
			{
				name: 'Get Variable',
				value: 'getVariable',
				description: 'Get an environment variable of a function by ID',
				action: 'Get a function variable',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a function',
				action: 'Update a function',
			},
			{
				name: 'Update Variable',
				value: 'updateVariable',
				description: 'Update an environment variable of a function',
				action: 'Update a function variable',
			},
		],
		default: 'get',
	},
];

const functionConfigOptions: INodeProperties[] = [
	{
		displayName: 'Commands',
		name: 'commands',
		type: 'string',
		default: '',
		placeholder: 'npm install',
		description: 'Build commands to run before the function is deployed',
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description:
			'Whether the function is enabled. When disabled, users cannot access the function, but server SDKs with an API key still can.',
	},
	{
		displayName: 'Entrypoint',
		name: 'entrypoint',
		type: 'string',
		default: '',
		placeholder: 'src/main.js',
		description: 'The entrypoint file, relative to the root directory of the function code',
	},
	{
		displayName: 'Events',
		name: 'events',
		type: 'string',
		default: '',
		placeholder: 'users.*.create, teams.*.update',
		description:
			'Events that trigger the function, as a comma-separated list or a JSON array. Maximum of 100 events.',
	},
	{
		displayName: 'Execute Roles',
		name: 'execute',
		type: 'string',
		default: '',
		placeholder: 'any, users, team:abc',
		description:
			'Role strings granted permission to execute the function, as a comma-separated list or a JSON array. By default no user can execute it. Maximum of 100 roles.',
	},
	{
		displayName: 'Logging',
		name: 'logging',
		type: 'boolean',
		default: true,
		description:
			'Whether executions keep logs and errors. When disabled, executions will be slightly faster.',
	},
	{
		displayName: 'Runtime',
		name: 'runtime',
		type: 'string',
		default: '',
		placeholder: 'node-22',
		description:
			'The new execution runtime ID, e.g. node-22 or python-3.12. See the Appwrite runtimes documentation for the IDs available on your instance. Leave empty to keep the current runtime.',
	},
	{
		displayName: 'Schedule',
		name: 'schedule',
		type: 'string',
		default: '',
		placeholder: '0 * * * *',
		description: 'Execution schedule in CRON syntax. Leave empty for no schedule.',
	},
	{
		displayName: 'Scopes',
		name: 'scopes',
		type: 'string',
		default: '',
		placeholder: 'users.read, databases.read',
		description:
			'API scopes allowed for the API key auto-generated for every execution, as a comma-separated list or a JSON array. Maximum of 100 scopes.',
	},
	{
		displayName: 'Timeout',
		name: 'timeout',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 15,
		description: 'Maximum execution time in seconds',
	},
];

export const functionFields: INodeProperties[] = [
	{
		displayName: 'Function Name or ID',
		name: 'functionId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getFunctions' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['function'],
				operation: [
					'activateDeployment',
					'createVariable',
					'delete',
					'deleteDeployment',
					'deleteVariable',
					'get',
					'getDeployment',
					'getManyDeployments',
					'getManyVariables',
					'getVariable',
					'update',
					'updateVariable',
				],
			},
		},
	},
	{
		displayName: 'Function ID',
		name: 'functionId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the function. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Deployment ID',
		name: 'deploymentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the code deployment',
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['activateDeployment', 'deleteDeployment', 'getDeployment'],
			},
		},
	},
	{
		displayName: 'Variable ID',
		name: 'variableId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the environment variable',
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['deleteVariable', 'getVariable', 'updateVariable'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The function name. Max length: 128 chars.',
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Runtime',
		name: 'runtime',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'node-22',
		description:
			'The execution runtime ID, e.g. node-22, python-3.12, php-8.3. See the Appwrite runtimes documentation for the IDs available on your instance.',
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		required: true,
		default: '',
		description: 'The variable key (environment variable name). Max length: 255 chars.',
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['createVariable', 'updateVariable'],
			},
		},
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		description: 'The variable value. Max length: 8192 chars.',
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['createVariable'],
			},
		},
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		description:
			'The new variable value. Leave empty to keep the current value. Max length: 8192 chars.',
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['updateVariable'],
			},
		},
	},
	{
		displayName: 'Secret',
		name: 'secret',
		type: 'boolean',
		default: false,
		description:
			'Whether the variable is secret. Secret variables can be updated or deleted, but only functions can read them during build and runtime.',
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['createVariable', 'updateVariable'],
			},
		},
	},
	...returnAllAndLimitProperties('function', ['getMany', 'getManyDeployments']),
	...queriesProperties('function', ['getMany', 'getManyDeployments']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['create'],
			},
		},
		options: functionConfigOptions.filter((option) => option.name !== 'runtime'),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['function'],
				operation: ['update'],
			},
		},
		options: functionConfigOptions,
	},
	listOptionsProperty('function', ['getMany', 'getManyDeployments']),
];
