import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import type { DocumentDatabaseType } from '../helpers/documentDatabases';
import { collectionLocator, documentDatabaseLocator } from './locators';
import {
	listOptionsProperty,
	permissionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	settingDescription,
	simplifyProperty,
} from './shared';

/**
 * The Collection resource of DocumentsDB and VectorsDB: collections and their
 * indexes. VectorsDB collections also fix the dimension of their embeddings.
 */
export function documentCollectionOperations(type: DocumentDatabaseType): INodeProperties[] {
	const { label } = type;
	return [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: [type.resources.collection],
				},
			},
			options: [
				{
					name: 'Create',
					value: 'create',
					description: `Create a new ${label} collection`,
					action: `Create ${label} collection`,
				},
				{
					name: 'Create Index',
					value: 'createIndex',
					description: 'Create an index on a collection',
					action: `Create ${label} collection index`,
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete a collection and all its documents',
					action: `Delete ${label} collection`,
				},
				{
					name: 'Delete Index',
					value: 'deleteIndex',
					description: 'Delete an index from a collection permanently',
					action: `Delete ${label} collection index`,
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Retrieve a single collection by its ID',
					action: `Get ${label} collection`,
				},
				{
					name: 'Get Index',
					value: 'getIndex',
					description: 'Retrieve a single index of a collection by its key',
					action: `Get ${label} collection index`,
				},
				{
					name: 'Get Many',
					value: 'getMany',
					description: 'List the collections in a database',
					action: `Get many ${label} collections`,
				},
				{
					name: 'Get Many Indexes',
					value: 'getManyIndexes',
					description: 'List the indexes of a collection',
					action: `Get many ${label} collection indexes`,
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Change the settings of an existing collection',
					action: `Update ${label} collection`,
				},
			],
			default: 'getMany',
		},
	];
}

const DOCUMENTS_DB_INDEX_TYPES: INodePropertyOptions[] = [
	{
		name: 'Fulltext',
		value: 'fulltext',
		description: 'Enables full-text search on the indexed attributes',
	},
	{
		name: 'Key',
		value: 'key',
		description: 'A plain index to speed up queries',
	},
	{
		name: 'Unique',
		value: 'unique',
		description: 'Rejects duplicate values in the indexed attributes',
	},
];

// HNSW is the approximate nearest-neighbour index behind Appwrite's vector
// index types; each one serves the similarity metric it is named after.
const VECTORS_DB_INDEX_TYPES: INodePropertyOptions[] = [
	{
		name: 'Cosine Similarity (HNSW)',
		value: 'hnsw_cosine',
		description: 'A vector index on embeddings for searches by cosine similarity',
	},
	{
		name: 'Dot Product (HNSW)',
		value: 'hnsw_dot',
		description: 'A vector index on embeddings for searches by dot product',
	},
	{
		name: 'Euclidean Distance (HNSW)',
		value: 'hnsw_euclidean',
		description: 'A vector index on embeddings for searches by Euclidean distance',
	},
	{
		name: 'Key',
		value: 'key',
		description: 'A plain index to speed up queries',
	},
	{
		name: 'Object',
		value: 'object',
		description: 'An index on the metadata object, to speed up metadata filters',
	},
	{
		name: 'Unique',
		value: 'unique',
		description: 'Rejects duplicate values in the indexed attributes',
	},
];

export function documentCollectionFields(type: DocumentDatabaseType): INodeProperties[] {
	const resource = type.resources.collection;
	const show = (operation: string[]) => ({ resource: [resource], operation });

	const documentSecurity = (update: boolean): INodeProperties => ({
		displayName: 'Document Security',
		name: 'documentSecurity',
		type: 'boolean',
		default: false,
		description: settingDescription(
			'Whether to enable document-level permissions. When enabled, users can access the documents they have been granted permission to, in addition to the collection-level permissions.',
			update,
		),
	});
	const enabled = (update: boolean): INodeProperties => ({
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description: settingDescription(
			'Whether the collection is enabled. When disabled, users cannot access it, but server SDKs with an API key still can.',
			update,
		),
	});
	const dimension = (name: string): INodeProperties => ({
		displayName: 'Dimension',
		name,
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 16000 },
		default: 1536,
		description:
			"How many numbers each document's embedding vector holds. It must match the output size of the embedding model, e.g. 1536 for OpenAI's text-embedding-3-small.",
	});

	const defaultIndexType = type.vectors ? 'hnsw_cosine' : 'key';

	const createOptions: INodeProperties[] = type.vectors
		? [documentSecurity(false), enabled(false)]
		: [
				{
					displayName: 'Attributes (JSON)',
					name: 'attributes',
					type: 'json',
					default: '[]',
					placeholder: 'e.g. [{"key": "title", "type": "varchar", "size": 255, "required": true}]',
					description:
						'Attribute definitions to create with the collection, as a JSON array. Each takes a key, a type (e.g. varchar, text, integer, double, boolean, datetime, or enum), and optionally size, required, default, and array. DocumentsDB is schemaless, so documents can also hold attributes that are not defined.',
				},
				documentSecurity(false),
				enabled(false),
				{
					displayName: 'Indexes (JSON)',
					name: 'indexes',
					type: 'json',
					default: '[]',
					placeholder: 'e.g. [{"key": "by_title", "type": "key", "attributes": ["title"]}]',
					description:
						'Index definitions to create with the collection, as a JSON array. Each takes a key, a type (e.g. key, fulltext, or unique), the attributes to index, and optionally orders and lengths.',
				},
			];

	const updateFields: INodeProperties[] = type.vectors
		? [dimension('dimension'), documentSecurity(true), enabled(true)]
		: [
				documentSecurity(true),
				enabled(true),
				{
					displayName: 'Purge Cache',
					name: 'purge',
					type: 'boolean',
					default: false,
					description:
						"Whether to clear the collection's cached list responses with the update, so readers see fresh data immediately instead of after the cache TTL",
				},
			];

	return [
		documentDatabaseLocator(type, { resource: [resource] }),
		collectionLocator(
			type,
			show(['createIndex', 'delete', 'deleteIndex', 'get', 'getIndex', 'getManyIndexes', 'update']),
		),
		{
			displayName: 'Collection ID',
			name: 'collectionId',
			type: 'string',
			default: '',
			description:
				'The ID for the new collection. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
			displayOptions: { show: show(['create']) },
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			required: true,
			default: '',
			description: 'Name for the collection, up to 128 characters',
			displayOptions: { show: show(['create', 'update']) },
		},
		...(type.vectors
			? [
					{
						...dimension('vectorDimension'),
						required: true,
						displayOptions: { show: show(['create']) },
					},
				]
			: []),
		permissionsProperty(
			resource,
			['create', 'update'],
			'Default permissions for documents in this collection, one permission string per line (or a JSON array). E.g. read("any"), create("users"). Document-level permissions apply on top when Document Security is enabled.',
		),
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: { show: show(['create']) },
			options: createOptions,
		},
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: show(['update']) },
			options: updateFields,
		},
		{
			displayName: 'Index Key',
			name: 'key',
			type: 'string',
			required: true,
			default: '',
			description: 'The key (name) of the index',
			displayOptions: { show: show(['createIndex', 'deleteIndex', 'getIndex']) },
		},
		{
			displayName: 'Index Type',
			name: 'indexType',
			type: 'options',
			options: type.vectors ? VECTORS_DB_INDEX_TYPES : DOCUMENTS_DB_INDEX_TYPES,
			default: defaultIndexType,
			description:
				'The kind of index to create, which decides how the indexed attributes can be queried',
			displayOptions: { show: show(['createIndex']) },
		},
		{
			displayName: 'Attributes',
			name: 'indexAttributes',
			type: 'string',
			required: true,
			default: '',
			placeholder: type.vectors ? 'e.g. embeddings' : 'e.g. status,createdAt',
			description: 'The attributes to index, comma-separated (or a JSON array of strings)',
			...(type.vectors
				? {
						hint: 'Vector (HNSW) indexes take embeddings, and an Object index takes metadata',
					}
				: {}),
			displayOptions: { show: show(['createIndex']) },
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: { show: show(['createIndex']) },
			options: [
				{
					displayName: 'Lengths',
					name: 'lengths',
					type: 'string',
					default: '',
					placeholder: 'e.g. 128,256',
					description:
						'The maximum indexed length for each attribute, matched position by position against Attributes, comma-separated numbers (or a JSON array)',
				},
				{
					displayName: 'Orders',
					name: 'orders',
					type: 'string',
					default: '',
					placeholder: 'e.g. asc,desc',
					description:
						'The sort order for each attribute, matched position by position against Attributes, comma-separated (asc or desc, or a JSON array)',
				},
			],
		},
		...returnAllAndLimitProperties(resource, ['getMany', 'getManyIndexes']),
		...queriesProperties(resource, ['getMany'], {
			terms: { record: 'collection', field: 'attribute' },
		}),
		...queriesProperties(resource, ['getManyIndexes'], {
			terms: { record: 'index', field: 'attribute' },
		}),
		simplifyProperty(resource, ['get', 'getMany']),
		listOptionsProperty(resource, ['getMany']),
	];
}
