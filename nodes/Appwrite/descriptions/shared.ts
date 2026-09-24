import type { INodeProperties } from 'n8n-workflow';

import { databaseLocator, tableLocator } from './locators';

/**
 * Standard Database locator, shown for the given resources/operations.
 */
export function databaseIdProperty(resources: string[], operations?: string[]): INodeProperties {
	return databaseLocator({
		resource: resources,
		...(operations ? { operation: operations } : {}),
	});
}

/**
 * Standard Table locator (a table is what Appwrite previously called a collection).
 */
export function tableIdProperty(resources: string[], operations?: string[]): INodeProperties {
	return tableLocator({
		resource: resources,
		...(operations ? { operation: operations } : {}),
	});
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
		placeholder: 'e.g. read("any")\nupdate("users")\ndelete("team:abc/owner")',
		description:
			description ??
			'Permission strings, one per line (or a JSON array). E.g. read("any"), create("users"), update("user:abc"), delete("team:abc"). Leave empty to apply Appwrite\'s defaults on create, or to keep the existing permissions on update. Enter [] to clear all permissions.',
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
 * The words the query builder, the Sort collection and the data inputs use for
 * the records a resource lists and their fields, so each database type reads
 * in its own terms: TablesDB has rows of columns, DocumentsDB and VectorsDB
 * have documents of attributes.
 */
export interface RecordTerms {
	/** One listed record, e.g. `row`. Cursor queries take its ID. */
	record: string;
	/** A field of that record, e.g. `column`. */
	field: string;
	/** An extra sentence for the tooltip of the query builder's field input. */
	fieldNote?: string;
}

/** The default terms, used by every TablesDB resource. */
const ROW_TERMS: RecordTerms = {
	record: 'row',
	field: 'column',
	fieldNote: 'A column is what Appwrite used to call an attribute.',
};

const titleCase = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * The explicit opt-in Update Many and Delete Many need before they run without
 * a query: Appwrite applies them to every record then.
 */
export function applyToAllProperty(
	resource: string,
	terms: RecordTerms = ROW_TERMS,
): INodeProperties {
	const plural = `${terms.record}s`;
	return {
		displayName: `Apply to All ${titleCase(plural)}`,
		name: 'applyToAll',
		type: 'boolean',
		default: false,
		description: `Whether to update or delete every ${terms.record} when no query selects which ones. Off, the node refuses to run without a query.`,
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['updateMany', 'deleteMany'],
			},
		},
	};
}

/**
 * Query parameters: a mode switch plus a visual builder and a raw JSON field.
 * The operations layer reads them via buildQueries().
 */
export function queriesProperties(
	resource: string,
	operations: string[],
	options: { hint?: string; terms?: RecordTerms } = {},
): INodeProperties[] {
	const show = { resource: [resource], operation: operations };
	const { record, field, fieldNote } = options.terms ?? ROW_TERMS;
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
					// The linter requires these fields in alphabetical order, which is
					// why the Type selector renders after fields whose visibility it
					// controls.
					values: [
						{
							displayName: titleCase(field),
							name: 'column',
							type: 'string',
							default: '',
							description: fieldNote
								? `The ${field} to query on. ${fieldNote}`
								: `The ${field} to query on`,
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
							description: `The comparison value. Numbers, booleans, and JSON arrays are parsed automatically; use "Treat Value as String" to disable that. For Select, provide ${field} names separated by commas (or a JSON array). For Limit/Offset, provide a number. For cursors, provide a ${record} ID.`,
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
 * The description of a setting offered both on Create, as an option, and on
 * Update, as an update field, where leaving it out keeps the current value.
 */
export function settingDescription(description: string, update: boolean): string {
	return update ? `${description} Leave this out to keep the current setting.` : description;
}

/**
 * Standard Simplify toggle for operations whose responses carry more than ten
 * fields, as the verification UX guidelines require.
 */
export function simplifyProperty(resource: string, operations: string[]): INodeProperties {
	return {
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: false,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: { show: { resource: [resource], operation: operations } },
	};
}

/**
 * Dedicated Sort collection for Get Many operations, translated into
 * orderAsc/orderDesc queries by the operations layer via getSortQueries().
 */
export function sortProperty(
	resource: string,
	operations: string[],
	terms: RecordTerms = ROW_TERMS,
): INodeProperties {
	return {
		displayName: 'Sort',
		name: 'sortUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Sort Rule',
		default: {},
		description: 'The order to return the results in',
		displayOptions: { show: { resource: [resource], operation: operations } },
		options: [
			{
				name: 'sortValues',
				displayName: 'Sort Rule',
				values: [
					{
						displayName: titleCase(terms.field),
						name: 'column',
						type: 'string',
						default: '',
						description: `The ${terms.field} to sort by`,
					},
					{
						displayName: 'Direction',
						name: 'direction',
						type: 'options',
						options: [
							{ name: 'Ascending', value: 'asc' },
							{ name: 'Descending', value: 'desc' },
						],
						default: 'asc',
						description: 'The direction to sort in',
					},
				],
			},
		],
	};
}

/**
 * Record data input for create/update operations: a mode switch between
 * individual fields and a raw JSON object. The operations layer reads it via
 * getRowData().
 */
export function dataProperties(
	resource: string,
	operations: string[],
	terms: RecordTerms = ROW_TERMS,
): INodeProperties[] {
	const { record, field } = terms;
	const show = { resource: [resource], operation: operations };
	return [
		{
			displayName: 'Data Mode',
			name: 'dataMode',
			type: 'options',
			options: [
				{
					name: 'Define Fields Below',
					value: 'fields',
					description: `Set each ${field} value individually`,
				},
				{
					name: 'JSON',
					value: 'json',
					description: `Provide the ${record} data as a JSON object`,
				},
			],
			default: 'fields',
			description: `How to specify the ${record} data`,
			displayOptions: { show },
		},
		{
			displayName: 'Fields',
			name: 'dataFieldsUi',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true, sortable: true },
			placeholder: 'Add field',
			default: {},
			description: `The ${field} values to set on the ${record}`,
			displayOptions: { show: { ...show, dataMode: ['fields'] } },
			options: [
				{
					name: 'fieldValues',
					displayName: 'Field',
					values: [
						{
							displayName: titleCase(field),
							name: 'fieldName',
							type: 'string',
							default: '',
							description: `Name of the ${field} to set`,
						},
						{
							displayName: 'Treat Value as String',
							name: 'treatValueAsString',
							type: 'boolean',
							default: false,
							description:
								'Whether to always send the value as a string instead of auto-detecting numbers, booleans, and arrays',
						},
						{
							displayName: 'Value',
							name: 'fieldValue',
							type: 'string',
							default: '',
							description:
								'Value to set. Numbers, booleans, null, and JSON arrays/objects are parsed automatically.',
						},
					],
				},
			],
		},
		{
			displayName: 'Data (JSON)',
			name: 'dataJson',
			type: 'json',
			default: '{}',
			description: `The ${record} data as a JSON object of ${field}-value pairs`,
			displayOptions: { show: { ...show, dataMode: ['json'] } },
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
