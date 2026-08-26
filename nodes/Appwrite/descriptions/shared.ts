import type { INodeProperties } from 'n8n-workflow';

/**
 * Standard Database ID parameter, shown for the given resources/operations.
 */
export function databaseIdProperty(resources: string[], operations?: string[]): INodeProperties {
	return {
		displayName: 'Database Name or ID',
		name: 'databaseId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDatabases' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: resources,
				...(operations ? { operation: operations } : {}),
			},
		},
	};
}

/**
 * Standard Table ID parameter (a table is what Appwrite previously called a collection).
 */
export function tableIdProperty(resources: string[], operations?: string[]): INodeProperties {
	return {
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: { loadOptionsDependsOn: ['databaseId'], loadOptionsMethod: 'getTables' },
		required: true,
		default: '',
		hint: 'A table is what Appwrite used to call a collection',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: resources,
				...(operations ? { operation: operations } : {}),
			},
		},
	};
}

/**
 * Permissions parameter: one permission string per line or a JSON array.
 */
export function permissionsProperty(
	resource: string,
	operations: string[],
	description?: string,
): INodeProperties {
	return {
		displayName: 'Permissions',
		name: 'permissions',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		placeholder: 'read("any")\nupdate("users")\ndelete("team:abc/owner")',
		description:
			description ??
			'Permission strings, one per line (or a JSON array). E.g. read("any"), create("users"), update("user:abc"), delete("team:abc"). Leave empty to use the default permissions.',
		displayOptions: {
			show: {
				resource: [resource],
				operation: operations,
			},
		},
	};
}

const QUERY_TYPE_OPTIONS = [
	{ name: 'Between', value: 'between' },
	{ name: 'Contains', value: 'contains' },
	{ name: 'Cursor After', value: 'cursorAfter' },
	{ name: 'Cursor Before', value: 'cursorBefore' },
	{ name: 'Ends With', value: 'endsWith' },
	{ name: 'Equal', value: 'equal' },
	{ name: 'Greater Than', value: 'greaterThan' },
	{ name: 'Greater Than or Equal', value: 'greaterThanEqual' },
	{ name: 'Is Not Null', value: 'isNotNull' },
	{ name: 'Is Null', value: 'isNull' },
	{ name: 'Less Than', value: 'lessThan' },
	{ name: 'Less Than or Equal', value: 'lessThanEqual' },
	{ name: 'Limit', value: 'limit' },
	{ name: 'Not Equal', value: 'notEqual' },
	{ name: 'Offset', value: 'offset' },
	{ name: 'Order Ascending', value: 'orderAsc' },
	{ name: 'Order Descending', value: 'orderDesc' },
	{ name: 'Search', value: 'search' },
	{ name: 'Select', value: 'select' },
	{ name: 'Starts With', value: 'startsWith' },
];

const NO_COLUMN_TYPES = ['limit', 'offset', 'cursorAfter', 'cursorBefore', 'select'];
const NO_VALUE_TYPES = ['isNull', 'isNotNull', 'orderAsc', 'orderDesc'];

/**
 * Query parameters: a mode switch plus a visual builder and a raw JSON field.
 * The operations layer reads them via buildQueries().
 */
export function queriesProperties(
	resource: string,
	operations: string[],
	options: { hint?: string } = {},
): INodeProperties[] {
	const show = { resource: [resource], operation: operations };
	return [
		{
			displayName: 'Query Mode',
			name: 'queriesMode',
			type: 'options',
			options: [
				{
					name: 'Builder',
					value: 'builder',
					description: 'Compose queries with a visual builder',
				},
				{
					name: 'JSON',
					value: 'json',
					description: 'Provide raw Appwrite query strings as a JSON array',
				},
			],
			default: 'builder',
			description: 'How to specify the queries',
			displayOptions: { show },
		},
		{
			displayName: 'Queries',
			name: 'queriesUi',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true, sortable: true },
			placeholder: 'Add Query',
			default: {},
			description: 'Filter, sort, and paginate the results',
			...(options.hint ? { hint: options.hint } : {}),
			displayOptions: { show: { ...show, queriesMode: ['builder'] } },
			options: [
				{
					name: 'queryValues',
					displayName: 'Query',
					values: [
						{
							displayName: 'Column',
							name: 'column',
							type: 'string',
							default: '',
							description: 'The column (attribute) to query on',
							displayOptions: { hide: { type: NO_COLUMN_TYPES } },
						},
						{
							displayName: 'Second Value',
							name: 'value2',
							type: 'string',
							default: '',
							description: 'The upper bound for Between queries',
							displayOptions: { show: { type: ['between'] } },
						},
						{
							displayName: 'Treat Value as String',
							name: 'treatValueAsString',
							type: 'boolean',
							default: false,
							description:
								'Whether to always send the value as a string instead of auto-detecting numbers, booleans, and arrays',
							displayOptions: {
								hide: {
									type: [
										...NO_VALUE_TYPES,
										'cursorAfter',
										'cursorBefore',
										'endsWith',
										'limit',
										'offset',
										'search',
										'select',
										'startsWith',
									],
								},
							},
						},
						{
							displayName: 'Type',
							name: 'type',
							type: 'options',
							options: QUERY_TYPE_OPTIONS,
							default: 'equal',
							description: 'The query method to apply',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							description:
								'The comparison value. Numbers, booleans, and JSON arrays are parsed automatically; use "Treat Value as String" to disable that. For Select, provide a JSON array of column names. For Limit/Offset, provide a number. For cursors, provide a row ID.',
							displayOptions: { hide: { type: NO_VALUE_TYPES } },
						},
					],
				},
			],
		},
		{
			displayName: 'Queries (JSON)',
			name: 'queriesJson',
			type: 'json',
			default: '[]',
			description:
				'A JSON array of Appwrite query strings, as produced by the Appwrite SDK Query helpers. Each entry is a JSON string like {"method":"equal","attribute":"status","values":["active"]}.',
			displayOptions: { show: { ...show, queriesMode: ['json'] } },
		},
	];
}

/**
 * Optional filters for a Get Many operation. The standards keep optional
 * fields inside a collection rather than on the node's face.
 */
export function listOptionsProperty(resource: string, operations: string[]): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { resource: [resource], operation: operations } },
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Return only results matching this search term',
			},
		],
	};
}

/**
 * Standard Return All / Limit pair used by Get Many operations.
 */
export function returnAllAndLimitProperties(
	resource: string,
	operations: string[],
): INodeProperties[] {
	const show = { resource: [resource], operation: operations };
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
		},
	];
}
