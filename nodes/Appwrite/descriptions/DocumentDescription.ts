import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import type { DocumentDatabaseType } from '../helpers/documentDatabases';
import { collectionLocator, documentDatabaseLocator } from './locators';
import type { RecordTerms } from './shared';
import {
	applyToAllProperty,
	dataProperties,
	permissionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	sortProperty,
} from './shared';

const DOCUMENT_TERMS: RecordTerms = { record: 'document', field: 'attribute' };

/**
 * The Document resource of DocumentsDB and VectorsDB. DocumentsDB documents
 * hold free-form attributes; VectorsDB documents hold an embedding vector and
 * a metadata object, and can be searched by similarity to a vector.
 */
export function documentOperations(type: DocumentDatabaseType): INodeProperties[] {
	const { label } = type;
	const options: INodePropertyOptions[] = [
		{
			name: 'Create',
			value: 'create',
			description: 'Create a new document',
			action: `Create ${label} document`,
		},
		{
			name: 'Create Many',
			value: 'createMany',
			description: 'Create multiple documents in a single request',
			action: `Create many ${label} documents`,
		},
		{
			name: 'Create or Update',
			value: 'upsert',
			description: 'Create a new document, or update the current one if it already exists (upsert)',
			action: `Create or update ${label} document`,
		},
		{
			name: 'Create or Update Many',
			value: 'upsertMany',
			description: 'Create or update multiple documents in a single request (upsert)',
			action: `Create or update many ${label} documents`,
		},
		...(type.vectors
			? []
			: [
					{
						name: 'Decrement Attribute',
						value: 'decrement',
						description: 'Decrement a numeric attribute of a document',
						action: `Decrement ${label} document attribute`,
					},
				]),
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete a document permanently',
			action: `Delete ${label} document`,
		},
		{
			name: 'Delete Many',
			value: 'deleteMany',
			description: 'Delete all documents that match the given queries',
			action: `Delete many ${label} documents`,
		},
		{
			name: 'Get',
			value: 'get',
			description: 'Retrieve a single document by its ID',
			action: `Get ${label} document`,
		},
		{
			name: 'Get Many',
			value: 'getMany',
			description: 'Retrieve a list of documents, with optional filters',
			action: `Get many ${label} documents`,
		},
		...(type.vectors
			? []
			: [
					{
						name: 'Increment Attribute',
						value: 'increment',
						description: 'Increment a numeric attribute of a document',
						action: `Increment ${label} document attribute`,
					},
				]),
		...(type.vectors
			? [
					{
						name: 'Search',
						value: 'search',
						description: 'Find the documents whose embeddings are most similar to a vector',
						action: `Search ${label} documents`,
					},
				]
			: []),
		{
			name: 'Update',
			value: 'update',
			description: type.vectors
				? 'Change the embeddings or metadata of an existing document'
				: 'Change the attribute values of an existing document',
			action: `Update ${label} document`,
		},
		{
			name: 'Update Many',
			value: 'updateMany',
			description: 'Apply the same update to all documents that match the given queries',
			action: `Update many ${label} documents`,
		},
	];

	return [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: [type.resources.document],
				},
			},
			options,
			default: 'get',
		},
	];
}

/**
 * VectorsDB document data: the embedding vector and the metadata object, the
 * only two attributes a VectorsDB collection has.
 */
function vectorDataProperties(resource: string): INodeProperties[] {
	const show = (operation: string[]) => ({ resource: [resource], operation });
	const embeddings: Omit<INodeProperties, 'description' | 'displayOptions'> = {
		displayName: 'Embeddings',
		name: 'vectorEmbeddings',
		type: 'json',
		default: '[]',
		placeholder: 'e.g. [0.12, -0.55, 0.88]',
	};
	const metadata: Omit<INodeProperties, 'description' | 'displayOptions'> = {
		displayName: 'Metadata',
		name: 'vectorMetadata',
		type: 'json',
		default: '{}',
		placeholder: 'e.g. {"source": "faq", "text": "How do I reset my password?"}',
	};
	return [
		{
			...embeddings,
			required: true,
			description:
				"The document's embedding vector, as a JSON array of numbers. It needs as many numbers as the collection's dimension, usually the output of an embedding model.",
			displayOptions: { show: show(['create']) },
		},
		{
			...embeddings,
			description:
				"The document's embedding vector, as a JSON array of numbers. It needs as many numbers as the collection's dimension. Leave empty to keep the current embeddings of an existing document.",
			displayOptions: { show: show(['upsert', 'update']) },
		},
		{
			...embeddings,
			description:
				'The embedding vector to set on every matching document, as a JSON array of numbers. Leave empty to keep their current embeddings.',
			displayOptions: { show: show(['updateMany']) },
		},
		{
			...metadata,
			description:
				'A JSON object stored with the document, such as the text the embeddings were made from, which queries can filter on. Leave empty for none.',
			displayOptions: { show: show(['create']) },
		},
		{
			...metadata,
			description:
				'A JSON object stored with the document, such as the text the embeddings were made from, which queries can filter on. Leave empty to keep the current metadata of an existing document.',
			displayOptions: { show: show(['upsert', 'update']) },
		},
		{
			...metadata,
			description:
				'The metadata object to set on every matching document. Leave empty to keep their current metadata.',
			displayOptions: { show: show(['updateMany']) },
		},
	];
}

/** The similarity search's own inputs (VectorsDB). */
function searchProperties(resource: string): INodeProperties[] {
	const show = { resource: [resource], operation: ['search'] };
	return [
		{
			displayName: 'Vector',
			name: 'searchVector',
			type: 'json',
			required: true,
			default: '[]',
			placeholder: 'e.g. [0.12, -0.55, 0.88]',
			description:
				'The vector to compare the stored embeddings with, as a JSON array of numbers, e.g. the embedding of a search text. Make it with the same embedding model as the stored embeddings.',
			displayOptions: { show },
		},
		{
			displayName: 'Similarity Metric',
			name: 'similarityMetric',
			type: 'options',
			options: [
				{
					name: 'Cosine Similarity',
					value: 'cosine',
					description: 'Compare the direction of the vectors, ignoring their length',
				},
				{
					name: 'Dot Product',
					value: 'dot',
					description:
						'Compare direction and length; for normalized embeddings it ranks like cosine similarity',
				},
				{
					name: 'Euclidean Distance',
					value: 'euclidean',
					description: 'Compare the straight-line distance between the vectors',
				},
			],
			default: 'cosine',
			description:
				"How to measure similarity. Use the metric of the collection's vector index, so the search can use it.",
			displayOptions: { show },
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
			hint: 'The most similar documents come first',
			displayOptions: { show },
		},
	];
}

export function documentFields(type: DocumentDatabaseType): INodeProperties[] {
	const resource = type.resources.document;
	const show = (operation: string[]) => ({ resource: [resource], operation });
	const documentIdOperations = type.vectors
		? ['delete', 'get', 'update']
		: ['decrement', 'delete', 'get', 'increment', 'update'];
	const queryOperations = type.vectors
		? ['deleteMany', 'get', 'getMany', 'search', 'updateMany']
		: ['deleteMany', 'get', 'getMany', 'updateMany'];

	return [
		documentDatabaseLocator(type, { resource: [resource] }),
		collectionLocator(type, { resource: [resource] }),
		{
			displayName: 'Document ID',
			name: 'documentId',
			type: 'string',
			required: true,
			default: '',
			description: 'The ID of the document',
			displayOptions: { show: show(documentIdOperations) },
		},
		{
			displayName: 'Document ID',
			name: 'documentId',
			type: 'string',
			default: '',
			description:
				'The ID for the document. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
			displayOptions: { show: show(['create']) },
		},
		{
			displayName: 'Document ID',
			name: 'documentId',
			type: 'string',
			default: '',
			hint: 'Create or Update needs the ID of an existing document. An auto-generated ID always creates a new document.',
			description:
				'The ID for the document. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
			displayOptions: { show: show(['upsert']) },
		},
		...(type.vectors
			? vectorDataProperties(resource)
			: dataProperties(resource, ['create', 'update', 'upsert', 'updateMany'], DOCUMENT_TERMS)),
		permissionsProperty(resource, ['create', 'update', 'upsert']),
		{
			displayName: 'Documents (JSON)',
			name: 'documentsJson',
			type: 'json',
			required: true,
			default: '[]',
			placeholder: type.vectors
				? 'e.g. [{"embeddings": [0.12, -0.55, 0.88], "metadata": {"source": "faq"}}]'
				: 'e.g. [{"title": "Hello", "status": "draft"}]',
			hint: 'Add "$id" to set a document\'s own ID (omit it to auto-generate one) and "$permissions" to set its permissions',
			description: type.vectors
				? "A JSON array of document objects to create or upsert. Each object holds the embeddings and metadata, and may also carry Appwrite's reserved keys for the document ID and its permissions."
				: "A JSON array of document objects to create or upsert. Each object holds the attribute values, and may also carry Appwrite's reserved keys for the document ID and its permissions.",
			displayOptions: { show: show(['createMany', 'upsertMany']) },
		},
		...(type.vectors
			? searchProperties(resource)
			: [
					{
						displayName: 'Attribute',
						name: 'documentAttribute',
						type: 'string',
						required: true,
						default: '',
						placeholder: 'e.g. views',
						description: 'The numeric attribute to change',
						displayOptions: { show: show(['decrement', 'increment']) },
					} satisfies INodeProperties,
					{
						displayName: 'Amount',
						name: 'amount',
						type: 'number',
						default: 1,
						description: 'The amount to change the attribute by',
						displayOptions: { show: show(['decrement', 'increment']) },
					} satisfies INodeProperties,
				]),
		...returnAllAndLimitProperties(resource, ['getMany']),
		...queriesProperties(resource, queryOperations, {
			hint: type.vectors
				? 'Get uses only Select queries, and Search uses the queries to filter the documents it compares. For Update Many and Delete Many the queries choose which documents are affected.'
				: 'Get uses only Select queries. For Update Many and Delete Many the queries choose which documents are affected.',
			terms: DOCUMENT_TERMS,
		}),
		applyToAllProperty(resource, DOCUMENT_TERMS),
		sortProperty(resource, ['getMany'], DOCUMENT_TERMS),
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: {
				show: {
					resource: [resource],
				},
			},
			options: [
				{
					displayName: 'Cache TTL (Seconds)',
					name: 'ttl',
					type: 'number',
					typeOptions: { minValue: 0, maxValue: 86400 },
					default: 0,
					description:
						'How long Appwrite may serve this list from its cache, up to 86400 seconds (24 hours). Document changes do not clear the cache, so results can be that old. 0 turns caching off.',
					displayOptions: {
						show: { '/operation': type.vectors ? ['getMany', 'search'] : ['getMany'] },
					},
				},
				...(type.vectors
					? []
					: [
							{
								displayName: 'Maximum',
								name: 'max',
								type: 'number',
								default: 0,
								description:
									'Maximum the attribute may reach; leave this option out for no maximum',
								displayOptions: { show: { '/operation': ['increment'] } },
							} satisfies INodeProperties,
							{
								displayName: 'Minimum',
								name: 'min',
								type: 'number',
								default: 0,
								description:
									'Minimum the attribute may reach; leave this option out for no minimum',
								displayOptions: { show: { '/operation': ['decrement'] } },
							} satisfies INodeProperties,
						]),
				{
					displayName: 'Transaction ID',
					name: 'transactionId',
					type: 'string',
					default: '',
					description: 'Run this operation as part of an existing database transaction',
				},
			],
		},
	];
}
