import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getResourceId,
	getStringParameter,
	parseStringList,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { DATABASE_ENGINES, enginesFor, findEngine } from '../helpers/dedicatedDatabases';
import { appwriteApiRequest } from '../transport';

/**
 * The fields each wide model keeps under Simplify. The database and branch
 * projections leave out the connection password and connection string.
 */
const DATABASE_FIELDS = [
	'$id',
	'name',
	'engine',
	'version',
	'status',
	'specification',
	'hostname',
	'connectionPort',
	'connectionUser',
	'$createdAt',
];
const BACKUP_FIELDS = [
	'$id',
	'$createdAt',
	'type',
	'trigger',
	'status',
	'sizeBytes',
	'policyId',
	'completedAt',
	'expiresAt',
	'error',
];
const BACKUP_POLICY_FIELDS = [
	'$id',
	'name',
	'schedule',
	'retention',
	'type',
	'enabled',
	'$createdAt',
	'$updatedAt',
];
const BRANCH_FIELDS = [
	'branchId',
	'branchName',
	'engine',
	'host',
	'port',
	'database',
	'username',
	'ssl',
	'expiresAt',
];
const OPERATION_FIELDS = [
	'$id',
	'$createdAt',
	'type',
	'status',
	'attempts',
	'startedAt',
	'completedAt',
	'errorCode',
	'errorMessage',
];
const RESTORATION_FIELDS = [
	'$id',
	'$createdAt',
	'type',
	'status',
	'backupId',
	'sourceDatabaseId',
	'targetTime',
	'completedAt',
	'error',
];
const SPECIFICATION_FIELDS = [
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
const STATUS_FIELDS = [
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

/**
 * Reads of a database or of one of its settings: the path under the database,
 * and the fields Simplify keeps where the model is wide.
 */
const DATABASE_READS = new Map<string, { path: string; simplify?: string[] }>([
	['get', { path: '', simplify: DATABASE_FIELDS }],
	['getManyExtensions', { path: '/extensions' }],
	['getPooler', { path: '/pooler' }],
	['getRecoveryWindow', { path: '/pitr' }],
	['getReplicas', { path: '/replicas' }],
	['getStatus', { path: '/status', simplify: STATUS_FIELDS }],
]);

/** A record addressed by its own ID under a database. */
interface SubRecord {
	/** The node parameter holding the ID. */
	parameter: string;
	label: string;
	/** The path of the record's collection under the database. */
	path: string;
	/** What Appwrite calls the ID, for the output of a delete. */
	key: string;
	simplify?: string[];
}

const BACKUP: SubRecord = {
	parameter: 'backupId',
	label: 'Backup ID',
	path: '/backups',
	key: 'backupId',
	simplify: BACKUP_FIELDS,
};
const BACKUP_POLICY: SubRecord = {
	parameter: 'backupPolicyId',
	label: 'Backup Policy ID',
	path: '/backups/policies',
	key: 'policyId',
	simplify: BACKUP_POLICY_FIELDS,
};
const BRANCH: SubRecord = {
	parameter: 'branchId',
	label: 'Branch ID',
	path: '/branches',
	key: 'branchId',
};
const EXTENSION: SubRecord = {
	parameter: 'extensionName',
	label: 'Extension Name or ID',
	path: '/extensions',
	key: 'extensionName',
};
const RESTORATION: SubRecord = {
	parameter: 'restorationId',
	label: 'Restoration ID',
	path: '/restorations',
	key: 'restorationId',
	simplify: RESTORATION_FIELDS,
};

const SUB_RECORD_READS = new Map<string, SubRecord>([
	['getBackup', BACKUP],
	['getBackupPolicy', BACKUP_POLICY],
	['getRestoration', RESTORATION],
]);

const SUB_RECORD_DELETES = new Map<string, SubRecord>([
	['deleteBackup', BACKUP],
	['deleteBackupPolicy', BACKUP_POLICY],
	['deleteBranch', BRANCH],
	['uninstallExtension', EXTENSION],
]);

/**
 * The pooler's CPU and memory overrides, which go back to a default
 * proportional to the database's size when sent as null.
 */
const POOLER_QUANTITIES = [
	'poolerCpuLimit',
	'poolerCpuRequest',
	'poolerMemoryLimit',
	'poolerMemoryRequest',
];

/** Entries fetched per page when Return All pages by offset. */
const PAGE_SIZE = 100;

/**
 * Read Execute SQL's bindings: a JSON array for positional placeholders or a
 * JSON object for named ones, typed in or produced by an expression. Returns
 * undefined when there are none, so the request carries no bindings at all.
 */
function parseBindings(
	this: IExecuteFunctions,
	raw: unknown,
	itemIndex: number,
): unknown[] | IDataObject | undefined {
	let value = raw;
	if (typeof value === 'string') {
		if (value.trim() === '') return undefined;
		try {
			value = jsonParse<unknown>(value);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), "Parameter 'Bindings' is not valid JSON", {
				description: (error as Error).message,
				itemIndex,
			});
		}
	}

	if (value === undefined || value === null) return undefined;
	if (Array.isArray(value)) return value.length > 0 ? value : undefined;
	if (typeof value === 'object') {
		return Object.keys(value).length > 0 ? (value as IDataObject) : undefined;
	}
	throw new NodeOperationError(
		this.getNode(),
		"Parameter 'Bindings' must be a JSON array or object",
		{
			description:
				'Use an array like [42, "active"] for positional placeholders, or an object like {"id": 42} for named ones.',
			itemIndex,
		},
	);
}

/**
 * Turn an Execute SQL result into one item per row. A statement without a
 * result set, such as an UPDATE, reports no columns and outputs its row
 * count instead, so the workflow can go on; a query that matched no rows
 * outputs no items, as n8n's own database nodes do.
 */
function executionItems(
	this: IExecuteFunctions,
	response: IDataObject,
	itemIndex: number,
): INodeExecutionData[] {
	// Passing on the rows of a truncated result as if they were all of them
	// would silently drop data, so a cut-short result stops the item instead.
	if (response.truncated === true) {
		throw new NodeOperationError(
			this.getNode(),
			"The result was truncated at the database's SQL API row or size limit",
			{
				description:
					'Page through the rows with LIMIT and OFFSET, raise SQL API Max Rows or SQL API Max Result Size with the Update operation, or set Output to Full Response to accept a partial result.',
				itemIndex,
			},
		);
	}

	const { rows, columns, ...summary } = response as IDataObject & {
		rows?: IDataObject[];
		columns?: unknown[];
	};
	if (rows !== undefined && rows.length > 0) return toItems(rows, itemIndex);
	if (columns !== undefined && columns.length > 0) return [];
	return toItems(summary, itemIndex);
}

export async function executeDedicatedDatabaseOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const engineValue = getStringParameter.call(this, 'databaseEngine', i);
	const engine = findEngine(engineValue);
	if (engine === undefined) {
		throw new NodeOperationError(this.getNode(), `Unknown database engine "${engineValue}"`, {
			description: `Expected one of: ${DATABASE_ENGINES.map((known) => known.value).join(', ')}.`,
			itemIndex: i,
		});
	}
	const engines = enginesFor(operation);
	if (!engines.includes(engine)) {
		throw new NodeOperationError(
			this.getNode(),
			`This operation is not available for ${engine.name} databases`,
			{
				description: `It works on ${engines.map((candidate) => candidate.name).join(' and ')} databases only. Choose one of those, or another operation.`,
				itemIndex: i,
			},
		);
	}

	const request = async (
		method: IHttpRequestMethods,
		path: string,
		options: { qs?: IDataObject; body?: IDataObject } = {},
	): Promise<IDataObject> => await appwriteApiRequest.call(this, method, path, options, i);

	// Resolved on first use: the engine-level operations act on no database.
	const databaseId = (): string =>
		getResourceId.call(this, 'dedicatedDatabaseId', i, 'database', 'Database');
	const databasePath = (): string => `${engine.path}/${encodeURIComponent(databaseId())}`;

	const subRecordId = (record: SubRecord): string => {
		const id = getStringParameter.call(this, record.parameter, i);
		if (id === '') {
			throw new NodeOperationError(this.getNode(), `The '${record.label}' parameter is empty`, {
				description: 'Enter a value, or check that the expression resolves to one.',
				itemIndex: i,
			});
		}
		return id;
	};

	const output = (data: IDataObject | IDataObject[], simplify?: string[]): INodeExecutionData[] =>
		toItems(
			simplify !== undefined && (this.getNodeParameter('simplify', i, false) as boolean)
				? simplifyItems(data, simplify)
				: data,
			i,
		);

	/**
	 * The settings the user added to a collection, named as the API names
	 * them. Text left blank is not sent, so the current value (or the API's
	 * default) stays.
	 */
	const settings = (fields: IDataObject): IDataObject => {
		const body: IDataObject = {};
		for (const [key, value] of Object.entries(fields)) {
			if (value !== '') body[key] = value;
		}
		if (typeof body.networkIPAllowlist === 'string') {
			body.networkIPAllowlist = parseStringList.call(
				this,
				body.networkIPAllowlist,
				'IP Allowlist',
				i,
			);
		}
		return body;
	};

	/** A list endpoint that pages with Appwrite queries. */
	const listByQueries = async (
		path: string,
		listKey: string,
		simplify: string[],
	): Promise<INodeExecutionData[]> => {
		const queries = buildQueries.call(this, i);
		if (this.getNodeParameter('returnAll', i, false) as boolean) {
			const all = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) => await request('GET', path, { qs: { queries: pageQueries } }),
				listKey,
				i,
			);
			return output(all as IDataObject[], simplify);
		}
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await request('GET', path, { qs: { queries: withLimit(queries, limit) } });
		return output((response[listKey] ?? []) as IDataObject[], simplify);
	};

	/**
	 * A list endpoint that takes plain limit and offset parameters, and its own
	 * filter parameters (from Options) instead of Appwrite queries.
	 */
	const listByOffset = async (
		path: string,
		listKey: string,
		simplify: string[],
	): Promise<INodeExecutionData[]> => {
		const filters = getCollectionParameter.call(this, 'options', i);
		if (this.getNodeParameter('returnAll', i, false) as boolean) {
			const all: IDataObject[] = [];
			for (;;) {
				const response = await request('GET', path, {
					qs: { ...filters, limit: PAGE_SIZE, offset: all.length },
				});
				const page = (response[listKey] ?? []) as IDataObject[];
				all.push(...page);
				// Stop on the reported total rather than on a short page, which
				// would end early if Appwrite capped the page size below ours.
				if (page.length === 0 || all.length >= Number(response.total ?? 0)) break;
			}
			return output(all, simplify);
		}
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await request('GET', path, { qs: { ...filters, limit } });
		return output((response[listKey] ?? []) as IDataObject[], simplify);
	};

	const read = DATABASE_READS.get(operation);
	if (read !== undefined) {
		return output(await request('GET', `${databasePath()}${read.path}`), read.simplify);
	}

	const subRecordRead = SUB_RECORD_READS.get(operation);
	if (subRecordRead !== undefined) {
		const id = subRecordId(subRecordRead);
		const path = `${databasePath()}${subRecordRead.path}/${encodeURIComponent(id)}`;
		return output(await request('GET', path), subRecordRead.simplify);
	}

	const record = SUB_RECORD_DELETES.get(operation);
	if (record !== undefined) {
		const id = subRecordId(record);
		await request('DELETE', `${databasePath()}${record.path}/${encodeURIComponent(id)}`);
		return toItems({ deleted: true, databaseId: databaseId(), [record.key]: id }, i);
	}

	if (operation === 'create') {
		const options = getCollectionParameter.call(this, 'options', i);
		const response = await request('POST', engine.path, {
			body: {
				databaseId: resolveId(getStringParameter.call(this, 'dedicatedDatabaseId', i, '')),
				name: getStringParameter.call(this, 'name', i),
				...settings(options),
			},
		});
		return toItems(response, i);
	}

	if (operation === 'createBackup') {
		const type = getStringParameter.call(this, 'backupType', i);
		return toItems(await request('POST', `${databasePath()}/backups`, { body: { type } }), i);
	}

	if (operation === 'createBackupPolicy') {
		const options = getCollectionParameter.call(this, 'options', i);
		const response = await request('POST', `${databasePath()}/backups/policies`, {
			body: {
				policyId: resolveId(getStringParameter.call(this, 'backupPolicyId', i, '')),
				name: getStringParameter.call(this, 'name', i),
				schedule: getStringParameter.call(this, 'backupSchedule', i),
				retention: this.getNodeParameter('backupRetentionDays', i) as number,
				...settings(options),
			},
		});
		return toItems(response, i);
	}

	if (operation === 'createBranch') {
		const options = getCollectionParameter.call(this, 'options', i) as { ttl?: number };
		const response = await request('POST', `${databasePath()}/branches`, {
			body: {
				branchId: resolveId(getStringParameter.call(this, 'branchId', i, '')),
				ttl: options.ttl,
			},
		});
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const id = databaseId();
		await request('DELETE', databasePath());
		return toItems({ deleted: true, databaseId: id }, i);
	}

	if (operation === 'executeSql') {
		// String(): an expression can resolve to a non-string value.
		const sql = String(this.getNodeParameter('sqlStatement', i) ?? '');
		if (sql.trim() === '') {
			throw new NodeOperationError(this.getNode(), "The 'SQL Statement' parameter is empty", {
				description: 'Enter the SQL statement to run.',
				itemIndex: i,
			});
		}
		const options = getCollectionParameter.call(this, 'options', i) as {
			bindings?: unknown;
			output?: string;
			timeoutSeconds?: number;
		};
		const response = await request('POST', `${databasePath()}/executions`, {
			body: {
				sql,
				bindings: parseBindings.call(this, options.bindings, i),
				timeoutSeconds: options.timeoutSeconds,
			},
		});
		return options.output === 'fullResponse'
			? toItems(response, i)
			: executionItems.call(this, response, i);
	}

	if (operation === 'getMany') {
		return await listByQueries(engine.path, 'databases', DATABASE_FIELDS);
	}

	if (operation === 'getManyBackupPolicies') {
		return await listByQueries(
			`${databasePath()}/backups/policies`,
			'policies',
			BACKUP_POLICY_FIELDS,
		);
	}

	if (operation === 'getManyBackups') {
		return await listByQueries(`${databasePath()}/backups`, 'backups', BACKUP_FIELDS);
	}

	if (operation === 'getManyBranches') {
		const response = await request('GET', `${databasePath()}/branches`);
		return output((response.branches ?? []) as IDataObject[], BRANCH_FIELDS);
	}

	if (operation === 'getManyOperations') {
		return await listByOffset(`${databasePath()}/operations`, 'operations', OPERATION_FIELDS);
	}

	if (operation === 'getManyRestorations') {
		return await listByOffset(`${databasePath()}/restorations`, 'restorations', RESTORATION_FIELDS);
	}

	if (operation === 'getManySpecifications') {
		const response = await request('GET', `${engine.path}/specifications`);
		return output((response.specifications ?? []) as IDataObject[], SPECIFICATION_FIELDS);
	}

	if (operation === 'installExtension') {
		const name = subRecordId(EXTENSION);
		return toItems(await request('POST', `${databasePath()}/extensions`, { body: { name } }), i);
	}

	if (operation === 'migrate') {
		const options = getCollectionParameter.call(this, 'options', i);
		const response = await request('POST', `${databasePath()}/migrations`, {
			body: {
				targetType: getStringParameter.call(this, 'migrationTargetType', i),
				...settings(options),
			},
		});
		return toItems(response, i);
	}

	if (operation === 'restore') {
		const type = getStringParameter.call(this, 'restorationType', i);
		const options = getCollectionParameter.call(this, 'options', i);
		const response = await request('POST', `${databasePath()}/restorations`, {
			body: {
				type,
				backupId: type === 'backup' ? subRecordId(BACKUP) : undefined,
				targetTime:
					type === 'pitr' ? getStringParameter.call(this, 'restorationTargetTime', i) : undefined,
				...settings(options),
			},
		});
		return toItems(response, i);
	}

	if (operation === 'rotateCredentials') {
		return toItems(await request('PATCH', `${databasePath()}/credentials`), i);
	}

	if (operation === 'triggerFailover') {
		const options = getCollectionParameter.call(this, 'options', i);
		const response = await request('POST', `${databasePath()}/failovers`, {
			body: settings(options),
		});
		return toItems(response, i);
	}

	if (operation === 'update') {
		const updateFields = getCollectionParameter.call(this, 'updateFields', i);
		return toItems(await request('PATCH', databasePath(), { body: settings(updateFields) }), i);
	}

	if (operation === 'updateBackupPolicy') {
		const updateFields = getCollectionParameter.call(this, 'updateFields', i);
		const path = `${databasePath()}/backups/policies/${encodeURIComponent(subRecordId(BACKUP_POLICY))}`;
		return toItems(await request('PATCH', path, { body: settings(updateFields) }), i);
	}

	if (operation === 'updateBackupStorage') {
		const options = getCollectionParameter.call(this, 'options', i);
		const response = await request('PUT', `${databasePath()}/backups/storage`, {
			body: {
				provider: getStringParameter.call(this, 'backupStorageProvider', i),
				bucket: getStringParameter.call(this, 'backupStorageBucket', i),
				accessKey: getStringParameter.call(this, 'backupStorageAccessKey', i),
				secretKey: getStringParameter.call(this, 'backupStorageSecretKey', i),
				...settings(options),
			},
		});
		return toItems(response, i);
	}

	if (operation === 'updateMaintenanceWindow') {
		const response = await request('PATCH', `${databasePath()}/maintenance`, {
			body: {
				day: getStringParameter.call(this, 'maintenanceDay', i),
				hourUtc: this.getNodeParameter('maintenanceHourUtc', i) as number,
			},
		});
		return toItems(response, i);
	}

	if (operation === 'updatePooler') {
		const updateFields = getCollectionParameter.call(this, 'updateFields', i);
		const body: IDataObject = { ...updateFields };
		// An override emptied in the UI means "back to the default", which the
		// API applies for null; leaving it out would keep the old override.
		for (const key of POOLER_QUANTITIES) {
			if (body[key] === '') body[key] = null;
		}
		return toItems(await request('PATCH', `${databasePath()}/pooler`, { body }), i);
	}

	if (operation === 'upgrade') {
		const response = await request('POST', `${databasePath()}/upgrades`, {
			body: { targetVersion: getStringParameter.call(this, 'targetVersion', i) },
		});
		return toItems(response, i);
	}

	throw new NodeOperationError(
		this.getNode(),
		`Unknown dedicated database operation "${operation}"`,
		{ itemIndex: i },
	);
}
