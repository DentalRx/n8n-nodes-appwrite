import type { INodeProperties } from 'n8n-workflow';

import {
	databaseIdProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	tableIdProperty,
} from './shared';

const SCALAR_TYPES = [
	'boolean',
	'datetime',
	'email',
	'enum',
	'float',
	'integer',
	'ip',
	'string',
	'url',
];

export const columnOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['column'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Add a new column (formerly known as an attribute) to a table',
				action: 'Create a column',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a column from a table',
				action: 'Delete a column',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a column by key',
				action: 'Get a column',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List the columns of a table',
				action: 'Get many columns',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a column',
				action: 'Update a column',
			},
		],
		default: 'getMany',
	},
];

export const columnFields: INodeProperties[] = [
	databaseIdProperty(['column']),
	tableIdProperty(['column']),
	{
		displayName: 'Column Type',
		name: 'columnType',
		type: 'options',
		options: [
			{ name: 'Boolean', value: 'boolean' },
			{ name: 'Datetime', value: 'datetime' },
			{ name: 'Email', value: 'email' },
			{ name: 'Enum', value: 'enum' },
			{ name: 'Float', value: 'float' },
			{ name: 'Integer', value: 'integer' },
			{ name: 'IP Address', value: 'ip' },
			{ name: 'Line', value: 'line' },
			{ name: 'Point', value: 'point' },
			{ name: 'Polygon', value: 'polygon' },
			{ name: 'Relationship', value: 'relationship' },
			{ name: 'String', value: 'string' },
			{ name: 'URL', value: 'url' },
		],
		default: 'string',
		description: 'The data type of the column',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		required: true,
		default: '',
		description: 'The key (name) of the column',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		required: true,
		default: '',
		description: 'The key (name) of the new column',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create'],
			},
			hide: {
				columnType: ['relationship'],
			},
		},
	},
	// String-specific
	{
		displayName: 'Size',
		name: 'size',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 255,
		description: 'The maximum length of the string, in characters',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create'],
				columnType: ['string'],
			},
		},
	},
	{
		displayName: 'Encrypt',
		name: 'encrypt',
		type: 'boolean',
		default: false,
		description:
			'Whether to encrypt the column value at rest. Encrypted columns cannot be queried or indexed.',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create'],
				columnType: ['string'],
			},
		},
	},
	// Enum-specific
	{
		displayName: 'Elements',
		name: 'elements',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'todo,in-progress,done',
		description: 'The allowed enum values, comma-separated (or a JSON array of strings)',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create', 'update'],
				columnType: ['enum'],
			},
		},
	},
	// Relationship-specific
	{
		displayName: 'Related Table ID',
		name: 'relatedTableId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the table to create the relationship with',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create'],
				columnType: ['relationship'],
			},
		},
	},
	{
		displayName: 'Relationship Type',
		name: 'relationshipType',
		type: 'options',
		options: [
			{ name: 'Many to Many', value: 'manyToMany' },
			{ name: 'Many to One', value: 'manyToOne' },
			{ name: 'One to Many', value: 'oneToMany' },
			{ name: 'One to One', value: 'oneToOne' },
		],
		default: 'oneToMany',
		description: 'The type of the relationship between the two tables',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create'],
				columnType: ['relationship'],
			},
		},
	},
	{
		displayName: 'Key',
		name: 'relationshipKey',
		type: 'string',
		default: '',
		description:
			'The key (name) of the relationship column. Leave empty to derive it from the related table name.',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create'],
				columnType: ['relationship'],
			},
		},
	},
	{
		displayName: 'Two Way',
		name: 'twoWay',
		type: 'boolean',
		default: false,
		description: 'Whether the relationship is two-way, adding a column on the related table too',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create'],
				columnType: ['relationship'],
			},
		},
	},
	{
		displayName: 'Two Way Key',
		name: 'twoWayKey',
		type: 'string',
		default: '',
		description: 'The key (name) of the column created on the related table for two-way relationships',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create'],
				columnType: ['relationship'],
				twoWay: [true],
			},
		},
	},
	{
		displayName: 'On Delete',
		name: 'onDelete',
		type: 'options',
		options: [
			{
				name: 'Cascade',
				value: 'cascade',
				description: 'Also delete the related rows',
			},
			{
				name: 'Restrict',
				value: 'restrict',
				description: 'Block deletion while related rows exist',
			},
			{
				name: 'Set Null',
				value: 'setNull',
				description: 'Set the relationship to NULL on the related rows',
			},
		],
		default: 'restrict',
		description: 'What happens to related rows when a row is deleted',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create', 'update'],
				columnType: ['relationship'],
			},
		},
	},
	// Common flags
	{
		displayName: 'Required',
		name: 'columnRequired',
		type: 'boolean',
		default: false,
		description:
			'Whether the column is required. Required columns cannot have a default value.',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create', 'update'],
			},
			hide: {
				columnType: ['relationship'],
			},
		},
	},
	{
		displayName: 'Default Value',
		name: 'defaultValue',
		type: 'string',
		default: '',
		description:
			'The default value for the column. Leave empty for no default. Parsed according to the column type (e.g. true/false for booleans, numbers for integer/float, a JSON array of coordinates for spatial types). Cannot be set when Required is enabled.',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create', 'update'],
			},
			hide: {
				columnType: ['relationship'],
			},
		},
	},
	{
		displayName: 'Array',
		name: 'array',
		type: 'boolean',
		default: false,
		description: 'Whether the column holds an array of values instead of a single value',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create'],
				columnType: SCALAR_TYPES,
			},
		},
	},
	// Integer/float bounds
	{
		displayName: 'Minimum',
		name: 'min',
		type: 'string',
		default: '',
		description: 'The smallest value the column accepts. Leave empty for no minimum.',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create', 'update'],
				columnType: ['integer', 'float'],
			},
		},
	},
	{
		displayName: 'Maximum',
		name: 'max',
		type: 'string',
		default: '',
		description: 'The largest value the column accepts. Leave empty for no maximum.',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create', 'update'],
				columnType: ['integer', 'float'],
			},
		},
	},
	// Update-only extras
	{
		displayName: 'New Size',
		name: 'newSize',
		type: 'string',
		default: '',
		description: 'A new maximum length for the string column. Leave empty to keep the current size.',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['update'],
				columnType: ['string'],
			},
		},
	},
	{
		displayName: 'New Key',
		name: 'newKey',
		type: 'string',
		default: '',
		description: 'A new key (name) for the column. Leave empty to keep the current key.',
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['update'],
			},
		},
	},
	...returnAllAndLimitProperties('column', ['getMany']),
	...queriesProperties('column', ['getMany']),
];
