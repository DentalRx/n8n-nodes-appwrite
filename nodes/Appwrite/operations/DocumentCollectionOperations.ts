import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getPermissions,
	getResourceId,
	getStringParameter,
	lookupEnum,
	parseJsonArrayParameter,
	parseStringList,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import type { DocumentDatabaseType } from '../helpers/documentDatabases';
import { appwriteApiRequest } from '../transport';
import { getIndexOrdersAndLengths } from './IndexOperations';

/** The collection-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'databaseId',
	'name',
	'enabled',
	'documentSecurity',
	'dimension',
	'$createdAt',
	'$updatedAt',
];

/** The index types each database type accepts, keyed by the value the UI stores. */
const DOCUMENTS_DB_INDEX_TYPES: Record<string, string> = {
	fulltext: 'fulltext',
	key: 'key',
	unique: 'unique',
};

const VECTORS_DB_INDEX_TYPES: Record<string, string> = {
	hnsw_cosine: 'hnsw_cosine',
	hnsw_dot: 'hnsw_dot',
	hnsw_euclidean: 'hnsw_euclidean',
	key: 'key',
	object: 'object',
	unique: 'unique',
};

interface CollectionSettings {
	attributes?: unknown;
	dimension?: number;
	documentSecurity?: boolean;
	enabled?: boolean;
	indexes?: unknown;
	purge?: boolean;
}

/** The executor of the Collection resource of DocumentsDB or VectorsDB. */
export function documentCollectionExecutor(type: DocumentDatabaseType) {
	return async function executeDocumentCollectionOperation(
		this: IExecuteFunctions,
		operation: string,
		i: number,
	): Promise<INodeExecutionData[]> {
		const databaseId = getResourceId.call(this, 'databaseId', i, 'database', 'Database');
		const collectionsPath = `${type.path}/${encodeURIComponent(databaseId)}/collections`;
		const collectionPath = (): string =>
			`${collectionsPath}/${encodeURIComponent(
				getResourceId.call(this, 'collectionId', i, 'collection', 'Collection'),
			)}`;
		const simplify = (data: IDataObject | IDataObject[]) =>
			(this.getNodeParameter('simplify', i, false) as boolean)
				? simplifyItems(data, SIMPLIFY_FIELDS)
				: data;
		/** A JSON array option, left out of the request when empty. */
		const jsonList = (value: unknown, label: string): unknown[] | undefined => {
			const list = parseJsonArrayParameter.call(this, value, label, i);
			return list.length > 0 ? list : undefined;
		};

		if (operation === 'create') {
			const collectionId = resolveId(getStringParameter.call(this, 'collectionId', i, ''));
			const name = getStringParameter.call(this, 'name', i);
			const permissions = getPermissions.call(this, i);
			const options = getCollectionParameter.call(this, 'options', i) as CollectionSettings;
			const body: IDataObject = {
				collectionId,
				name,
				permissions,
				documentSecurity: options.documentSecurity,
				enabled: options.enabled,
			};
			if (type.vectors) {
				body.dimension = this.getNodeParameter('vectorDimension', i) as number;
			} else {
				body.attributes = jsonList(options.attributes, 'Attributes (JSON)');
				body.indexes = jsonList(options.indexes, 'Indexes (JSON)');
			}
			const response = await appwriteApiRequest.call(this, 'POST', collectionsPath, { body }, i);
			return toItems(response, i);
		}

		if (operation === 'get') {
			const response = await appwriteApiRequest.call(this, 'GET', collectionPath(), {}, i);
			return toItems(simplify(response), i);
		}

		if (operation === 'getMany') {
			const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
			const search =
				(getCollectionParameter.call(this, 'options', i) as { search?: string }).search ?? '';
			const queries = buildQueries.call(this, i);
			const searchArg = search === '' ? undefined : search;

			if (returnAll) {
				const collections = await fetchAllPages.call(
					this,
					queries,
					async (pageQueries) =>
						await appwriteApiRequest.call(
							this,
							'GET',
							collectionsPath,
							{ qs: { queries: pageQueries, search: searchArg } },
							i,
						),
					'collections',
					i,
				);
				return toItems(simplify(collections as IDataObject[]), i);
			}

			const limit = this.getNodeParameter('limit', i, 50) as number;
			const response = await appwriteApiRequest.call(
				this,
				'GET',
				collectionsPath,
				{ qs: { queries: withLimit(queries, limit), search: searchArg } },
				i,
			);
			return toItems(simplify(response.collections as IDataObject[]), i);
		}

		if (operation === 'update') {
			const path = collectionPath();
			const name = getStringParameter.call(this, 'name', i);
			const permissions = getPermissions.call(this, i);
			const updateFields = getCollectionParameter.call(
				this,
				'updateFields',
				i,
			) as CollectionSettings;
			// PUT treats omitted `enabled`/`documentSecurity` as their defaults
			// (true/false), so a plain rename would re-enable a disabled collection
			// or turn document security off. Read the current values when the
			// user leaves the options out.
			let { enabled, documentSecurity } = updateFields;
			if (enabled === undefined || documentSecurity === undefined) {
				const current = await appwriteApiRequest.call(this, 'GET', path, {}, i);
				enabled = enabled ?? (current.enabled as boolean | undefined);
				documentSecurity = documentSecurity ?? (current.documentSecurity as boolean | undefined);
			}
			const body: IDataObject = { name, permissions, documentSecurity, enabled };
			if (!type.vectors) body.purge = updateFields.purge;
			const response = await appwriteApiRequest.call(this, 'PUT', path, { body }, i);
			return toItems(response, i);
		}

		if (operation === 'delete') {
			const collectionId = getResourceId.call(this, 'collectionId', i, 'collection', 'Collection');
			await appwriteApiRequest.call(
				this,
				'DELETE',
				`${collectionsPath}/${encodeURIComponent(collectionId)}`,
				{},
				i,
			);
			return toItems({ deleted: true, databaseId, collectionId }, i);
		}

		const indexesPath = (): string => `${collectionPath()}/indexes`;

		if (operation === 'createIndex') {
			const path = indexesPath();
			const key = getStringParameter.call(this, 'key', i);
			const indexType = lookupEnum(
				this,
				type.vectors ? VECTORS_DB_INDEX_TYPES : DOCUMENTS_DB_INDEX_TYPES,
				getStringParameter.call(this, 'indexType', i),
				'index type',
				i,
			);
			const attributes = parseStringList.call(
				this,
				getStringParameter.call(this, 'indexAttributes', i, ''),
				'Attributes',
				i,
			);
			const { orders, lengths } = getIndexOrdersAndLengths.call(this, i);
			const response = await appwriteApiRequest.call(
				this,
				'POST',
				path,
				{ body: { key, type: indexType, attributes, orders, lengths } },
				i,
			);
			return toItems(response, i);
		}

		if (operation === 'getIndex') {
			const key = getStringParameter.call(this, 'key', i);
			const response = await appwriteApiRequest.call(
				this,
				'GET',
				`${indexesPath()}/${encodeURIComponent(key)}`,
				{},
				i,
			);
			return toItems(response, i);
		}

		if (operation === 'getManyIndexes') {
			const path = indexesPath();
			const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
			const queries = buildQueries.call(this, i);

			if (returnAll) {
				const indexes = await fetchAllPages.call(
					this,
					queries,
					async (pageQueries) =>
						await appwriteApiRequest.call(this, 'GET', path, { qs: { queries: pageQueries } }, i),
					'indexes',
					i,
				);
				return toItems(indexes as IDataObject[], i);
			}

			const limit = this.getNodeParameter('limit', i, 50) as number;
			const response = await appwriteApiRequest.call(
				this,
				'GET',
				path,
				{ qs: { queries: withLimit(queries, limit) } },
				i,
			);
			return toItems(response.indexes as IDataObject[], i);
		}

		if (operation === 'deleteIndex') {
			const collectionId = getResourceId.call(this, 'collectionId', i, 'collection', 'Collection');
			const key = getStringParameter.call(this, 'key', i);
			await appwriteApiRequest.call(
				this,
				'DELETE',
				`${indexesPath()}/${encodeURIComponent(key)}`,
				{},
				i,
			);
			return toItems({ deleted: true, databaseId, collectionId, key }, i);
		}

		throw new NodeOperationError(
			this.getNode(),
			`Unknown ${type.label} collection operation "${operation}"`,
			{ itemIndex: i },
		);
	};
}
