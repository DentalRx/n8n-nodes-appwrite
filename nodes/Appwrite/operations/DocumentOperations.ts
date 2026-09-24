import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	getResourceId,
	getRowData,
	getSortQueries,
	lookupEnum,
	parseJsonArrayParameter,
	parseJsonParameter,
	parseVector,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { Query, resolveId } from '../helpers/appwrite';
import type { DocumentDatabaseType } from '../helpers/documentDatabases';
import { EMBEDDINGS_ATTRIBUTE } from '../helpers/documentDatabases';
import { appwriteApiRequest } from '../transport';

/** The similarity query behind each Similarity Metric option. */
const SIMILARITY_QUERIES: Record<string, (attribute: string, vector: number[]) => string> = {
	cosine: Query.vectorCosine,
	dot: Query.vectorDot,
	euclidean: Query.vectorEuclidean,
};

/**
 * Read the data of a VectorsDB document: its embedding vector and metadata
 * object. Empty inputs are left out, so an update or upsert keeps the
 * document's current values; Create requires the embeddings.
 */
function getVectorDocumentData(
	this: IExecuteFunctions,
	i: number,
	requireEmbeddings: boolean,
): IDataObject {
	const embeddings = parseVector.call(
		this,
		this.getNodeParameter('vectorEmbeddings', i, ''),
		'Embeddings',
		i,
	);
	if (requireEmbeddings && embeddings.length === 0) {
		throw new NodeOperationError(this.getNode(), "The 'Embeddings' parameter is empty", {
			description:
				"A VectorsDB document needs its embedding vector: a JSON array with as many numbers as the collection's dimension.",
			itemIndex: i,
		});
	}
	const metadata = parseJsonParameter.call(
		this,
		this.getNodeParameter('vectorMetadata', i, ''),
		'Metadata',
		i,
	);

	const data: IDataObject = {};
	if (embeddings.length > 0) data.embeddings = embeddings;
	if (Object.keys(metadata).length > 0) data.metadata = metadata;
	return data;
}

/** The executor of the Document resource of DocumentsDB or VectorsDB. */
export function documentExecutor(type: DocumentDatabaseType) {
	return async function executeDocumentOperation(
		this: IExecuteFunctions,
		operation: string,
		i: number,
	): Promise<INodeExecutionData[]> {
		const databaseId = getResourceId.call(this, 'databaseId', i, 'database', 'Database');
		const collectionId = getResourceId.call(this, 'collectionId', i, 'collection', 'Collection');
		const options = this.getNodeParameter('options', i, {}) as {
			max?: number;
			min?: number;
			transactionId?: string;
			ttl?: number;
		};
		const transactionId = options.transactionId || undefined;
		// 0 is Appwrite's own default (no caching), so it need not be sent.
		const ttl = options.ttl || undefined;

		const documentsPath = `${type.path}/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collectionId)}/documents`;
		const documentPath = (documentId: string): string =>
			`${documentsPath}/${encodeURIComponent(documentId)}`;
		const getData = (requireEmbeddings = false): IDataObject =>
			type.vectors
				? getVectorDocumentData.call(this, i, requireEmbeddings)
				: getRowData.call(this, i);

		if (operation === 'create') {
			const documentId = resolveId(this.getNodeParameter('documentId', i, '') as string);
			const data = getData(true);
			const permissions = getPermissions.call(this, i);
			const response = await appwriteApiRequest.call(
				this,
				'POST',
				documentsPath,
				{ body: { documentId, data, permissions, transactionId } },
				i,
			);
			return toItems(response, i);
		}

		if (operation === 'createMany' || operation === 'upsertMany') {
			const documents = parseJsonArrayParameter.call(
				this,
				this.getNodeParameter('documentsJson', i),
				'Documents (JSON)',
				i,
			) as IDataObject[];
			const response = await appwriteApiRequest.call(
				this,
				operation === 'createMany' ? 'POST' : 'PUT',
				documentsPath,
				{ body: { documents, transactionId } },
				i,
			);
			return toItems(response.documents as IDataObject[], i);
		}

		if (operation === 'get') {
			const documentId = getResourceId.call(this, 'documentId', i, 'document', 'Document ID');
			const queries = buildQueries.call(this, i);
			const response = await appwriteApiRequest.call(
				this,
				'GET',
				documentPath(documentId),
				{ qs: { queries: queries.length > 0 ? queries : undefined, transactionId } },
				i,
			);
			return toItems(response, i);
		}

		if (operation === 'getMany') {
			const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
			const queries = [...buildQueries.call(this, i), ...getSortQueries.call(this, i)];

			if (returnAll) {
				const documents = await fetchAllPages.call(
					this,
					queries,
					async (pageQueries) =>
						await appwriteApiRequest.call(
							this,
							'GET',
							documentsPath,
							{ qs: { queries: pageQueries, transactionId, ttl } },
							i,
						),
					'documents',
					i,
				);
				return toItems(documents as IDataObject[], i);
			}

			const limit = this.getNodeParameter('limit', i, 50) as number;
			const response = await appwriteApiRequest.call(
				this,
				'GET',
				documentsPath,
				{ qs: { queries: withLimit(queries, limit), transactionId, ttl } },
				i,
			);
			return toItems(response.documents as IDataObject[], i);
		}

		if (operation === 'search' && type.vectors) {
			const vector = parseVector.call(this, this.getNodeParameter('searchVector', i), 'Vector', i);
			if (vector.length === 0) {
				throw new NodeOperationError(this.getNode(), "The 'Vector' parameter is empty", {
					description:
						"Provide the vector to search with: a JSON array with as many numbers as the collection's dimension, such as the embedding of your search text.",
					itemIndex: i,
				});
			}
			const similarity = lookupEnum(
				this,
				SIMILARITY_QUERIES,
				this.getNodeParameter('similarityMetric', i, 'cosine') as string,
				'similarity metric',
				i,
			);
			const limit = this.getNodeParameter('limit', i, 50) as number;
			const queries = withLimit(
				[similarity(EMBEDDINGS_ATTRIBUTE, vector), ...buildQueries.call(this, i)],
				limit,
			);
			// The query endpoint takes the queries in the body: a vector of real
			// embeddings (hundreds to thousands of numbers) is too long for a URL.
			const response = await appwriteApiRequest.call(
				this,
				'POST',
				`${documentsPath}/query`,
				{ body: { queries, transactionId, ttl } },
				i,
			);
			return toItems(response.documents as IDataObject[], i);
		}

		if (operation === 'update') {
			const documentId = getResourceId.call(this, 'documentId', i, 'document', 'Document ID');
			const data = getData();
			const permissions = getPermissions.call(this, i);
			const response = await appwriteApiRequest.call(
				this,
				'PATCH',
				documentPath(documentId),
				{ body: { data, permissions, transactionId } },
				i,
			);
			return toItems(response, i);
		}

		if (operation === 'updateMany') {
			const data = getData();
			const queries = buildQueries.call(this, i);
			const response = await appwriteApiRequest.call(
				this,
				'PATCH',
				documentsPath,
				{
					body: {
						data,
						queries: queries.length > 0 ? queries : undefined,
						transactionId,
					},
				},
				i,
			);
			return toItems(response.documents as IDataObject[], i);
		}

		if (operation === 'upsert') {
			const documentId = resolveId(this.getNodeParameter('documentId', i, '') as string);
			const data = getData();
			const permissions = getPermissions.call(this, i);
			const response = await appwriteApiRequest.call(
				this,
				'PUT',
				documentPath(documentId),
				{ body: { data, permissions, transactionId } },
				i,
			);
			return toItems(response, i);
		}

		if (operation === 'delete') {
			const documentId = getResourceId.call(this, 'documentId', i, 'document', 'Document ID');
			// The spec declares transactionId a query-string parameter on DELETE.
			await appwriteApiRequest.call(
				this,
				'DELETE',
				documentPath(documentId),
				{ qs: { transactionId } },
				i,
			);
			return toItems({ deleted: true, documentId }, i);
		}

		if (operation === 'deleteMany') {
			const queries = buildQueries.call(this, i);
			const response = await appwriteApiRequest.call(
				this,
				'DELETE',
				documentsPath,
				{ qs: { queries: queries.length > 0 ? queries : undefined, transactionId } },
				i,
			);
			// One item per deleted document, matching Create/Update/Upsert Many.
			return toItems(response.documents as IDataObject[], i);
		}

		if ((operation === 'increment' || operation === 'decrement') && !type.vectors) {
			const documentId = getResourceId.call(this, 'documentId', i, 'document', 'Document ID');
			const attribute = this.getNodeParameter('documentAttribute', i) as string;
			const value = this.getNodeParameter('amount', i, 1) as number;
			const bound = operation === 'increment' ? { max: options.max } : { min: options.min };
			const response = await appwriteApiRequest.call(
				this,
				'PATCH',
				`${documentPath(documentId)}/${encodeURIComponent(attribute)}/${operation}`,
				{ body: { value, ...bound, transactionId } },
				i,
			);
			return toItems(response, i);
		}

		throw new NodeOperationError(
			this.getNode(),
			`Unknown ${type.label} document operation "${operation}"`,
			{ itemIndex: i },
		);
	};
}
