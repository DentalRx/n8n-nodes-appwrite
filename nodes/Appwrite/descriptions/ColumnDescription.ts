import type { INodeProperties } from 'n8n-workflow';

import {
	databaseIdProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	tableIdProperty,
} from './shared';

const SCALAR_TYPES = [
	'bigint',
	'boolean',
	'datetime',
	'email',
	'enum',
	'float',
	'integer',
	'ip',
	'longtext',
	'mediumtext',
	'string',
	'text',
	'url',
	'varchar',
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
				action: 'Create column',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a column from a table permanently',
				action: 'Delete column',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single column by its key',
				action: 'Get column',
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
				description: 'Change the settings of an existing column',
				action: 'Update column',
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
			{ name: 'Big Integer', value: 'bigint' },
			{ name: 'Boolean', value: 'boolean' },
			{ name: 'Datetime', value: 'datetime' },
			{ name: 'Email', value: 'email' },
			{ name: 'Enum', value: 'enum' },
			{ name: 'Float', value: 'float' },
			{ name: 'Integer', value: 'integer' },
			{ name: 'IP Address', value: 'ip' },
			{ name: 'Line', value: 'line' },
			{ name: 'Long Text', value: 'longtext' },
			{ name: 'Medium Text', value: 'mediumtext' },
			{ name: 'Point', value: 'point' },
			{ name: 'Polygon', value: 'polygon' },
			{ name: 'Relationship', value: 'relationship' },
			{ name: 'String', value: 'string' },
			{ name: 'Text', value: 'text' },
			{ name: 'URL', value: 'url' },
			{ name: 'Varchar', value: 'varchar' },
		],
		default: 'string',
		description:
			"The data type of the column. When updating, this must match the column's existing type.",
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
				columnType: ['string', 'varchar'],
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
		placeholder: 'e.g. todo,in-progress,done',
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
		displayName: 'Related Table Name or ID',
		name: 'relatedTableId',
		type: 'options',
		typeOptions: { loadOptionsDependsOn: ['databaseId'], loadOptionsMethod: 'getTables' },
		required: true,
		default: '',
		description:
			'The table to create the relationship with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
		name: 'key',
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
	// Common flags
	{
		displayName: 'Required',
		name: 'columnRequired',
		type: 'boolean',
		default: false,
		description: 'Whether the column is required. Required columns cannot have a default value.',
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
	...returnAllAndLimitProperties('column', ['getMany']),
	...queriesProperties('column', ['getMany']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['column'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Array',
				name: 'array',
				type: 'boolean',
				default: false,
				description: 'Whether the column holds an array of values instead of a single value',
				displayOptions: {
					show: {
						'/operation': ['create'],
						'/columnType': SCALAR_TYPES,
					},
				},
			},
			{
				displayName: 'Default Value',
				name: 'defaultValue',
				type: 'string',
				default: '',
				description:
					'The default value for the column. It is parsed according to the column type (e.g. true/false for booleans, numbers for integer/float, a JSON array of coordinates for spatial types). It cannot be set when Required is enabled. Appwrite makes this part of the column definition rather than a patch, so leaving it out on Update clears any default the column already had.',
				displayOptions: {
					hide: {
						'/columnType': ['relationship'],
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
						'/operation': ['create'],
						'/columnType': ['string', 'text', 'mediumtext', 'longtext', 'varchar'],
					},
				},
			},
			{
				displayName: 'Maximum',
				name: 'max',
				type: 'number',
				default: 0,
				description: 'The largest value the column accepts. Leave this option out for no maximum.',
				displayOptions: {
					show: {
						'/columnType': ['bigint', 'float', 'integer'],
					},
				},
			},
			{
				displayName: 'Minimum',
				name: 'min',
				type: 'number',
				default: 0,
				description: 'The smallest value the column accepts. Leave this option out for no minimum.',
				displayOptions: {
					show: {
						'/columnType': ['bigint', 'float', 'integer'],
					},
				},
			},
			{
				displayName: 'New Key',
				name: 'newKey',
				type: 'string',
				default: '',
				description:
					'A new key (name) for the column. Leave this option out to keep the current key.',
				displayOptions: {
					show: {
						'/operation': ['update'],
					},
				},
			},
			{
				displayName: 'New Size',
				name: 'newSize',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 255,
				description:
					'A new maximum length for the string column, in characters. Leave this option out to keep the current size.',
				displayOptions: {
					show: {
						'/operation': ['update'],
						'/columnType': ['string', 'varchar'],
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
				description:
					"What happens to related rows when a row is deleted. A new column defaults to Restrict; leaving this option out on Update keeps the column's current setting.",
				displayOptions: {
					show: {
						'/columnType': ['relationship'],
					},
				},
			},
			{
				displayName: 'Two Way',
				name: 'twoWay',
				type: 'boolean',
				default: false,
				description:
					'Whether the relationship is two-way, adding a column on the related table too',
				displayOptions: {
					show: {
						'/operation': ['create'],
						'/columnType': ['relationship'],
					},
				},
			},
			{
				displayName: 'Two Way Key',
				name: 'twoWayKey',
				type: 'string',
				default: '',
				description:
					'The key (name) of the column created on the related table for two-way relationships',
				displayOptions: {
					show: {
						'/operation': ['create'],
						'/columnType': ['relationship'],
						twoWay: [true],
					},
				},
			},
		],
	},
];
