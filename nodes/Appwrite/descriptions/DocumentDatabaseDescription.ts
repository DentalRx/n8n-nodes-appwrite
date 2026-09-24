import type { INodeProperties } from 'n8n-workflow';

import type { DocumentDatabaseType } from '../helpers/documentDatabases';
import { documentDatabaseLocator } from './locators';
import {
	queriesProperties,
	returnAllAndLimitProperties,
	settingDescription,
	simplifyProperty,
} from './shared';

/**
 * The Database resource of DocumentsDB and VectorsDB: the databases
 * themselves, the dedicated-database endpoints (status, replicas, failover,
 * lifecycle operations, specifications) and the type's transactions.
 */
export function documentDatabaseOperations(type: DocumentDatabaseType): INodeProperties[] {
	const { label } = type;
	return [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: [type.resources.database],
				},
			},
			options: [
				{
					name: 'Commit Transaction',
					value: 'commitTransaction',
					description: 'Commit a transaction, applying all its staged operations',
					action: `Commit ${label} transaction`,
				},
				{
					name: 'Create',
					value: 'create',
					description: `Create a new ${label} database`,
					action: `Create ${label} database`,
				},
				{
					name: 'Create Transaction',
					value: 'createTransaction',
					description: 'Start a new transaction',
					action: `Create ${label} transaction`,
				},
				{
					name: 'Create Transaction Operations',
					value: 'createTransactionOperations',
					description: 'Stage additional operations inside an open transaction',
					action: `Create ${label} transaction operations`,
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete a database and all its collections',
					action: `Delete ${label} database`,
				},
				{
					name: 'Delete Transaction',
					value: 'deleteTransaction',
					description: 'Delete a transaction without applying it',
					action: `Delete ${label} transaction`,
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Retrieve a single database by its ID',
					action: `Get ${label} database`,
				},
				{
					name: 'Get Many',
					value: 'getMany',
					description: `List the ${label} databases in the project`,
					action: `Get many ${label} databases`,
				},
				{
					name: 'Get Many Operations',
					value: 'getManyOperations',
					description:
						'List the provisioning, update, backup, and failover operations recorded for a dedicated database, newest first',
					action: `Get many ${label} database operations`,
				},
				{
					name: 'Get Many Specifications',
					value: 'getManySpecifications',
					description:
						'List the dedicated database specifications available on the current plan, with their limits and prices',
					action: `Get many ${label} specifications`,
				},
				{
					name: 'Get Many Transactions',
					value: 'getManyTransactions',
					description: `List transactions across all ${label} databases`,
					action: `Get many ${label} transactions`,
				},
				{
					name: 'Get Replicas',
					value: 'getReplicas',
					description:
						'Get the high availability status of a dedicated database: its replicas, their replication lag, and the sync mode',
					action: `Get ${label} database replicas`,
				},
				{
					name: 'Get Status',
					value: 'getStatus',
					description:
						'Get the health, readiness, uptime, connections, and storage volumes of a dedicated database',
					action: `Get ${label} database status`,
				},
				{
					name: 'Get Transaction',
					value: 'getTransaction',
					description: 'Retrieve a single transaction by its ID',
					action: `Get ${label} transaction`,
				},
				{
					name: 'Roll Back Transaction',
					value: 'rollbackTransaction',
					description: 'Roll back a transaction, discarding all its staged operations',
					action: `Roll back ${label} transaction`,
				},
				{
					name: 'Trigger Failover',
					value: 'failover',
					description: 'Promote a replica of a dedicated database to primary',
					action: `Trigger ${label} database failover`,
				},
				{
					name: 'Update',
					value: 'update',
					description:
						'Rename a database, change whether it is enabled, or change its dedicated specification',
					action: `Update ${label} database`,
				},
			],
			default: 'getMany',
		},
	];
}

/**
 * Settings shared by Create (as options) and Update (as update fields). The
 * dedicated ones only apply to a database backed by a dedicated specification
 * (Appwrite Cloud).
 */
function databaseSettings(update: boolean): INodeProperties[] {
	return [
		{
			displayName: 'Enabled',
			name: 'enabled',
			type: 'boolean',
			default: true,
			description: settingDescription(
				'Whether the database is enabled. When disabled, users cannot access it, but server SDKs with an API key still can.',
				update,
			),
		},
		{
			displayName: 'Replicas',
			name: 'replicas',
			type: 'number',
			typeOptions: { minValue: 0, maxValue: 5 },
			default: 0,
			description: settingDescription(
				'Number of high availability replicas (0 to 5) of the dedicated database. High availability is on when above 0; a serverless database must keep 0.',
				update,
			),
		},
		update
			? {
					displayName: 'Specification',
					name: 'specification',
					type: 'string',
					default: '',
					placeholder: 'e.g. s-2vcpu-2gb',
					description:
						'The slug of the dedicated specification to resize to, as listed by Get Many Specifications. Moving a serverless database onto a dedicated specification migrates its data. Leave this out to keep the current specification.',
				}
			: {
					displayName: 'Specification',
					name: 'specification',
					type: 'string',
					default: 'serverless',
					placeholder: 'e.g. s-2vcpu-2gb',
					description:
						'Where to run the database: serverless for the shared pool, or the slug of a dedicated specification (as listed by Get Many Specifications) to provision a dedicated database',
				},
		{
			displayName: 'Sync Mode',
			name: 'syncMode',
			type: 'options',
			options: [
				{
					name: 'Async',
					value: 'async',
					description: 'Replicate writes asynchronously (fastest)',
				},
				{
					name: 'Quorum',
					value: 'quorum',
					description: 'Wait for a majority of replicas to confirm each write',
				},
				{
					name: 'Sync',
					value: 'sync',
					description: 'Wait for the replicas to confirm each write (strongest consistency)',
				},
			],
			default: 'async',
			description: settingDescription(
				"How writes replicate to the dedicated database's replicas. It takes effect once there is at least one replica.",
				update,
			),
		},
	];
}

export function documentDatabaseFields(type: DocumentDatabaseType): INodeProperties[] {
	const resource = type.resources.database;
	const show = (operation: string[]) => ({ resource: [resource], operation });
	return [
		documentDatabaseLocator(
			type,
			show([
				'delete',
				'failover',
				'get',
				'getManyOperations',
				'getReplicas',
				'getStatus',
				'update',
			]),
		),
		{
			displayName: 'Database ID',
			name: 'databaseId',
			type: 'string',
			default: '',
			placeholder: 'unique()',
			description:
				'The ID for the new database. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
			displayOptions: { show: show(['create']) },
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			required: true,
			default: '',
			description: 'Name for the database, up to 128 characters',
			displayOptions: { show: show(['create', 'update']) },
		},
		{
			displayName: 'Transaction ID',
			name: 'transactionId',
			type: 'string',
			required: true,
			default: '',
			description:
				'The ID returned by the Create Transaction operation when the transaction was started',
			displayOptions: {
				show: show([
					'commitTransaction',
					'createTransactionOperations',
					'deleteTransaction',
					'getTransaction',
					'rollbackTransaction',
				]),
			},
		},
		{
			displayName: 'TTL (Seconds)',
			name: 'ttl',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 300,
			description:
				'Number of seconds before the transaction expires. Appwrite rejects a value outside the range its deployment allows.',
			displayOptions: { show: show(['createTransaction']) },
		},
		{
			displayName: 'Operations (JSON)',
			name: 'operationsJson',
			type: 'json',
			required: true,
			default: '[]',
			placeholder: type.vectors
				? '[{"action": "create", "databaseId": "main", "collectionId": "articles", "documentId": "unique()", "data": {"embeddings": [0.12, -0.55, 0.88]}}]'
				: '[{"action": "create", "databaseId": "main", "collectionId": "articles", "documentId": "unique()", "data": {"title": "Hello"}}]',
			description:
				'A JSON array of operations to stage in the transaction. Each entry describes an action (e.g. create, update, delete) with its databaseId, collectionId, documentId, and data.',
			displayOptions: { show: show(['createTransactionOperations']) },
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: { show: show(['create']) },
			options: databaseSettings(false),
		},
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: show(['update']) },
			options: databaseSettings(true),
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: { show: show(['failover']) },
			options: [
				{
					displayName: 'Target Replica ID',
					name: 'targetReplicaId',
					type: 'string',
					default: '',
					description:
						'The replica to promote. Leave this out to promote the healthiest one. To repair a failover, upgrade, or resize that did not finish, name the replica, since the healthiest may be the one that operation already promoted.',
				},
			],
		},
		...returnAllAndLimitProperties(resource, [
			'getMany',
			'getManyOperations',
			'getManyTransactions',
		]),
		...queriesProperties(resource, ['getMany'], {
			terms: { record: 'database', field: 'attribute' },
		}),
		...queriesProperties(resource, ['getManyTransactions'], {
			terms: { record: 'transaction', field: 'attribute' },
		}),
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: { show: show(['getManyOperations']) },
			options: [
				{
					displayName: 'Status',
					name: 'status',
					type: 'options',
					options: [
						{ name: 'Completed', value: 'completed' },
						{ name: 'Failed', value: 'failed' },
						{ name: 'Queued', value: 'queued' },
						{ name: 'Running', value: 'running' },
					],
					default: 'running',
					description: 'Return only the operations with this status',
				},
			],
		},
		simplifyProperty(resource, [
			'get',
			'getMany',
			'getManyOperations',
			'getManySpecifications',
			'getStatus',
		]),
	];
}
