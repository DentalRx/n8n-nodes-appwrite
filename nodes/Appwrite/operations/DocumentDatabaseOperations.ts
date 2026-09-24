import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getResourceId,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import type { DocumentDatabaseType } from '../helpers/documentDatabases';
import { appwriteApiRequest } from '../transport';
import type { TransactionAction } from './TransactionOperations';
import { executeTransactionAction } from './TransactionOperations';

/** The database-model fields most workflows read, for the Simplify toggle. */
const DATABASE_SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'enabled',
	'type',
	'status',
	'specification',
	'replicas',
	'$createdAt',
	'$updatedAt',
];

/** The status-model fields most workflows read, for the Simplify toggle. */
const STATUS_SIMPLIFY_FIELDS = [
	'health',
	'ready',
	'engine',
	'version',
	'uptime',
	'connections',
	'syncMode',
	'effectiveSyncMode',
	'syncDegraded',
	'replicas',
];

/** The specification-model fields most workflows read, for the Simplify toggle. */
const SPECIFICATION_SIMPLIFY_FIELDS = [
	'slug',
	'name',
	'price',
	'cpu',
	'memory',
	'maxConnections',
	'includedStorage',
	'includedBandwidth',
	'enabled',
];

/** The operation-model fields most workflows read, for the Simplify toggle. */
const OPERATION_SIMPLIFY_FIELDS = [
	'$id',
	'databaseId',
	'type',
	'status',
	'attempts',
	'requestedAt',
	'startedAt',
	'completedAt',
	'errorCode',
	'errorMessage',
];

/** The transaction operations of this resource, and the action each runs. */
const TRANSACTION_OPERATIONS = new Map<string, TransactionAction>([
	['commitTransaction', 'commit'],
	['createTransaction', 'create'],
	['createTransactionOperations', 'createOperations'],
	['deleteTransaction', 'delete'],
	['getTransaction', 'get'],
	['getManyTransactions', 'getMany'],
	['rollbackTransaction', 'rollback'],
]);

/** Entries fetched per page when listing a database's operations. */
const OPERATIONS_PAGE_SIZE = 100;

interface DatabaseSettings {
	enabled?: boolean;
	replicas?: number;
	specification?: string;
	syncMode?: string;
}

/** The executor of the Database resource of DocumentsDB or VectorsDB. */
export function documentDatabaseExecutor(type: DocumentDatabaseType) {
	return async function executeDocumentDatabaseOperation(
		this: IExecuteFunctions,
		operation: string,
		i: number,
	): Promise<INodeExecutionData[]> {
		const transactionAction = TRANSACTION_OPERATIONS.get(operation);
		if (transactionAction !== undefined) {
			return await executeTransactionAction.call(this, type.path, transactionAction, i);
		}

		const databasePath = (): string =>
			`${type.path}/${encodeURIComponent(
				getResourceId.call(this, 'databaseId', i, 'database', 'Database'),
			)}`;
		const simplify = (data: IDataObject | IDataObject[], fields: string[]) =>
			(this.getNodeParameter('simplify', i, false) as boolean) ? simplifyItems(data, fields) : data;

		if (operation === 'create') {
			const databaseId = resolveId(this.getNodeParameter('databaseId', i, '') as string);
			const name = this.getNodeParameter('name', i) as string;
			const options = this.getNodeParameter('options', i, {}) as DatabaseSettings;
			const response = await appwriteApiRequest.call(
				this,
				'POST',
				type.path,
				{
					body: {
						databaseId,
						name,
						enabled: options.enabled,
						specification: options.specification || undefined,
						replicas: options.replicas,
						syncMode: options.syncMode,
					},
				},
				i,
			);
			return toItems(response, i);
		}

		if (operation === 'get') {
			const response = await appwriteApiRequest.call(this, 'GET', databasePath(), {}, i);
			return toItems(simplify(response, DATABASE_SIMPLIFY_FIELDS), i);
		}

		if (operation === 'getMany') {
			const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
			const queries = buildQueries.call(this, i);

			if (returnAll) {
				const databases = await fetchAllPages.call(
					this,
					queries,
					async (pageQueries) =>
						await appwriteApiRequest.call(
							this,
							'GET',
							type.path,
							{ qs: { queries: pageQueries } },
							i,
						),
					'databases',
					i,
				);
				return toItems(simplify(databases as IDataObject[], DATABASE_SIMPLIFY_FIELDS), i);
			}

			const limit = this.getNodeParameter('limit', i, 50) as number;
			const response = await appwriteApiRequest.call(
				this,
				'GET',
				type.path,
				{ qs: { queries: withLimit(queries, limit) } },
				i,
			);
			return toItems(simplify(response.databases as IDataObject[], DATABASE_SIMPLIFY_FIELDS), i);
		}

		if (operation === 'update') {
			const path = databasePath();
			const name = this.getNodeParameter('name', i) as string;
			const updateFields = this.getNodeParameter('updateFields', i, {}) as DatabaseSettings;
			// PUT treats an omitted `enabled` as its default (true), so a plain
			// rename would silently re-enable a disabled database. Read the
			// current value when the user leaves the option out.
			let enabled = updateFields.enabled;
			if (enabled === undefined) {
				const current = await appwriteApiRequest.call(this, 'GET', path, {}, i);
				enabled = current.enabled as boolean | undefined;
			}
			const response = await appwriteApiRequest.call(
				this,
				'PUT',
				path,
				{
					body: {
						name,
						enabled,
						specification: updateFields.specification || undefined,
						replicas: updateFields.replicas,
						syncMode: updateFields.syncMode,
					},
				},
				i,
			);
			return toItems(response, i);
		}

		if (operation === 'delete') {
			const databaseId = getResourceId.call(this, 'databaseId', i, 'database', 'Database');
			await appwriteApiRequest.call(
				this,
				'DELETE',
				`${type.path}/${encodeURIComponent(databaseId)}`,
				{},
				i,
			);
			return toItems({ deleted: true, databaseId }, i);
		}

		if (operation === 'getStatus') {
			const response = await appwriteApiRequest.call(
				this,
				'GET',
				`${databasePath()}/status`,
				{},
				i,
			);
			return toItems(simplify(response, STATUS_SIMPLIFY_FIELDS), i);
		}

		if (operation === 'getReplicas') {
			const response = await appwriteApiRequest.call(
				this,
				'GET',
				`${databasePath()}/replicas`,
				{},
				i,
			);
			return toItems(response, i);
		}

		if (operation === 'failover') {
			const options = this.getNodeParameter('options', i, {}) as { targetReplicaId?: string };
			const response = await appwriteApiRequest.call(
				this,
				'POST',
				`${databasePath()}/failovers`,
				{ body: { targetReplicaId: options.targetReplicaId || undefined } },
				i,
			);
			return toItems(response, i);
		}

		if (operation === 'getManyOperations') {
			const path = `${databasePath()}/operations`;
			const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
			const status =
				(this.getNodeParameter('options', i, {}) as { status?: string }).status || undefined;
			let operations: IDataObject[];

			if (returnAll) {
				// This endpoint pages by limit and offset rather than by queries, so
				// fetchAllPages does not apply. Page on until the reported total is
				// reached, in case Appwrite caps a page below the size asked for.
				operations = [];
				for (;;) {
					const response = await appwriteApiRequest.call(
						this,
						'GET',
						path,
						{ qs: { status, limit: OPERATIONS_PAGE_SIZE, offset: operations.length } },
						i,
					);
					const page = (response.operations ?? []) as IDataObject[];
					operations.push(...page);
					const done =
						typeof response.total === 'number'
							? operations.length >= response.total
							: page.length < OPERATIONS_PAGE_SIZE;
					if (page.length === 0 || done) break;
				}
			} else {
				const limit = this.getNodeParameter('limit', i, 50) as number;
				const response = await appwriteApiRequest.call(
					this,
					'GET',
					path,
					{ qs: { status, limit } },
					i,
				);
				operations = (response.operations ?? []) as IDataObject[];
			}
			return toItems(simplify(operations, OPERATION_SIMPLIFY_FIELDS), i);
		}

		if (operation === 'getManySpecifications') {
			const response = await appwriteApiRequest.call(
				this,
				'GET',
				`${type.path}/specifications`,
				{},
				i,
			);
			return toItems(
				simplify((response.specifications ?? []) as IDataObject[], SPECIFICATION_SIMPLIFY_FIELDS),
				i,
			);
		}

		throw new NodeOperationError(
			this.getNode(),
			`Unknown ${type.label} database operation "${operation}"`,
			{ itemIndex: i },
		);
	};
}
