import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getResourceId,
	getStringParameter,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** The database fields most workflows read, for the Simplify toggle. */
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

/** The database-status fields most workflows read, for the Simplify toggle. */
const STATUS_SIMPLIFY_FIELDS = [
	'health',
	'ready',
	'engine',
	'version',
	'uptime',
	'connections',
	'syncMode',
	'syncDegraded',
	'replicas',
	'volumes',
];

/** The migration-model fields most workflows read, for the Simplify toggle. */
const MIGRATION_SIMPLIFY_FIELDS = [
	'$id',
	'$createdAt',
	'databaseId',
	'specification',
	'phase',
	'lastError',
	'lagDocuments',
	'autoCutover',
	'cutoverAt',
	'paused',
];

/** The operation-model fields most workflows read, for the Simplify toggle. */
const OPERATION_SIMPLIFY_FIELDS = [
	'$id',
	'$createdAt',
	'type',
	'status',
	'attempts',
	'requestedAt',
	'startedAt',
	'completedAt',
	'errorCode',
	'errorMessage',
];

/** The specification-model fields most workflows read, for the Simplify toggle. */
const SPECIFICATION_SIMPLIFY_FIELDS = [
	'slug',
	'name',
	'enabled',
	'price',
	'cpu',
	'memory',
	'maxConnections',
	'includedStorage',
	'includedBandwidth',
	'storageOverageRate',
];

/**
 * Page size for the operations list, which pages with limit and offset
 * parameters rather than queries. It is the endpoint's own default, so every
 * page asked for is one it accepts.
 */
const OPERATIONS_PAGE_SIZE = 25;

export async function executeDatabaseOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Resolved on first use: create and the specifications list act on no existing database.
	const databasePath = (): string => {
		const databaseId = getResourceId.call(this, 'databaseId', i, 'database', 'Database');
		return `/tablesdb/${encodeURIComponent(databaseId)}`;
	};
	const migrationPath = (): string => {
		const migrationId = getStringParameter.call(this, 'databaseMigrationId', i);
		return `${databasePath()}/migrations/${encodeURIComponent(migrationId)}`;
	};
	const simplified = (data: IDataObject | IDataObject[], fields: string[]) =>
		(this.getNodeParameter('simplify', i, false) as boolean) ? simplifyItems(data, fields) : data;

	if (operation === 'create') {
		const databaseId = resolveId(getStringParameter.call(this, 'databaseId', i, ''));
		const name = getStringParameter.call(this, 'name', i);
		const enabled = this.getNodeParameter('enabled', i, true) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/tablesdb',
			{ body: { databaseId, name, enabled } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createCutover') {
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${migrationPath()}/cutovers`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createFailover') {
		const { targetReplicaId } = getCollectionParameter.call(this, 'options', i) as {
			targetReplicaId?: string;
		};
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${databasePath()}/failovers`,
			{ body: { targetReplicaId: targetReplicaId || undefined } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createMigration') {
		const specification = getStringParameter.call(this, 'databaseSpecification', i);
		const { autoCutover } = getCollectionParameter.call(this, 'options', i) as {
			autoCutover?: boolean;
		};
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${databasePath()}/migrations`,
			{ body: { specification, autoCutover } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'deleteMigration') {
		const databaseId = getResourceId.call(this, 'databaseId', i, 'database', 'Database');
		const migrationId = getStringParameter.call(this, 'databaseMigrationId', i);
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/tablesdb/${encodeURIComponent(databaseId)}/migrations/${encodeURIComponent(migrationId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, databaseId, migrationId }, i);
	}

	if (operation === 'get') {
		const databaseId = getResourceId.call(this, 'databaseId', i, 'database', 'Database');
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/tablesdb/${encodeURIComponent(databaseId)}`,
			{},
			i,
		);
		return toItems(simplified(response, DATABASE_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search =
			(getCollectionParameter.call(this, 'options', i) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const databases = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/tablesdb',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'databases',
				i,
			);
			return toItems(simplified(databases as IDataObject[], DATABASE_SIMPLIFY_FIELDS), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/tablesdb',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(simplified(response.databases as IDataObject[], DATABASE_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getManyMigrations') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${databasePath()}/migrations`,
			{},
			i,
		);
		return toItems(simplified(response.migrations as IDataObject[], MIGRATION_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getManyOperations') {
		const path = `${databasePath()}/operations`;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const max = returnAll ? Infinity : (this.getNodeParameter('limit', i, 50) as number);
		const { operationStatus } = getCollectionParameter.call(this, 'options', i) as {
			operationStatus?: string;
		};

		const operations: IDataObject[] = [];
		for (;;) {
			const limit = Math.min(OPERATIONS_PAGE_SIZE, max - operations.length);
			const response = await appwriteApiRequest.call(
				this,
				'GET',
				path,
				{ qs: { status: operationStatus || undefined, limit, offset: operations.length } },
				i,
			);
			const page = (response.operations ?? []) as IDataObject[];
			operations.push(...page);
			if (page.length < limit || operations.length >= max) break;
		}
		return toItems(simplified(operations, OPERATION_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getManySpecifications') {
		const response = await appwriteApiRequest.call(this, 'GET', '/tablesdb/specifications', {}, i);
		return toItems(
			simplified(response.specifications as IDataObject[], SPECIFICATION_SIMPLIFY_FIELDS),
			i,
		);
	}

	if (operation === 'getMigration') {
		const response = await appwriteApiRequest.call(this, 'GET', migrationPath(), {}, i);
		return toItems(simplified(response, MIGRATION_SIMPLIFY_FIELDS), i);
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

	if (operation === 'getStatus') {
		const response = await appwriteApiRequest.call(this, 'GET', `${databasePath()}/status`, {}, i);
		return toItems(simplified(response, STATUS_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'update') {
		const databaseId = getResourceId.call(this, 'databaseId', i, 'database', 'Database');
		const name = getStringParameter.call(this, 'name', i);
		const updateFields = getCollectionParameter.call(this, 'updateFields', i) as {
			enabled?: boolean;
		};
		// PUT /tablesdb/{id} treats an omitted `enabled` as its default (true), so
		// a plain rename would silently re-enable a disabled database. Read the
		// current value when the user leaves the option out.
		let enabled = updateFields.enabled;
		if (enabled === undefined) {
			const current = await appwriteApiRequest.call(
				this,
				'GET',
				`/tablesdb/${encodeURIComponent(databaseId)}`,
				{},
				i,
			);
			enabled = current.enabled as boolean | undefined;
		}
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`/tablesdb/${encodeURIComponent(databaseId)}`,
			{ body: { name, enabled } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const databaseId = getResourceId.call(this, 'databaseId', i, 'database', 'Database');
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/tablesdb/${encodeURIComponent(databaseId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, databaseId }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown database operation "${operation}"`, {
		itemIndex: i,
	});
}
