import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties } from './shared';

export const projectVariableOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['projectVariable'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new variable that every function and site in the project can read',
				action: 'Create project variable',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a project variable permanently',
				action: 'Delete project variable',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a project variable',
				action: 'Get project variable',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: "Retrieve a list of the project's global variables",
				action: 'Get many project variables',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the key, value, or secret flag of a project variable',
				action: 'Update project variable',
			},
		],
		default: 'get',
	},
];

const show = (operations: string[]) => ({ resource: ['projectVariable'], operation: operations });

const SECRET_DESCRIPTION =
	"Whether the value is secret. Only functions and sites can read a secret variable's value, at build and run time; it never appears in the output, and a variable cannot stop being secret.";

export const projectVariableFields: INodeProperties[] = [
	{
		displayName: 'Variable ID',
		name: 'variableId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the project variable',
		displayOptions: { show: show(['delete', 'get', 'update']) },
	},
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. STRIPE_API_URL',
		description:
			'The name functions and sites read the variable by. Letters, digits, and underscores only, not starting with a digit. Max length: 255 characters.',
		displayOptions: { show: show(['create']) },
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The variable value. Max length: 8192 characters.',
		displayOptions: { show: show(['create']) },
	},
	{
		displayName: 'Secret',
		name: 'secret',
		type: 'boolean',
		default: true,
		description: SECRET_DESCRIPTION,
		displayOptions: { show: show(['create']) },
	},
	{
		displayName: 'Variable ID',
		name: 'variableId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the variable. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: { show: show(['create']) },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description: 'The settings to change. Settings you do not add keep their current values.',
		displayOptions: { show: show(['update']) },
		options: [
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: '',
				placeholder: 'e.g. STRIPE_API_URL',
				description:
					'The name functions and sites read the variable by. Letters, digits, and underscores only, not starting with a digit.',
			},
			{
				displayName: 'Secret',
				name: 'secret',
				type: 'boolean',
				default: true,
				description: SECRET_DESCRIPTION,
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The variable value. Max length: 8192 characters.',
			},
		],
	},
	...returnAllAndLimitProperties('projectVariable', ['getMany']),
	...queriesProperties('projectVariable', ['getMany'], {
		hint: 'You can filter on key and secret',
	}),
];
