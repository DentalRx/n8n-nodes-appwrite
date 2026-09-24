import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { DATABASE_ENGINES, enginesFor } from '../helpers/dedicatedDatabases';
import { resourceLocator } from './locators';
import { queriesProperties, returnAllAndLimitProperties, simplifyProperty } from './shared';

const RESOURCE = 'dedicatedDatabase';

export const dedicatedDatabaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [RESOURCE],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new database. The output includes its connection credentials.',
				action: 'Create dedicated database',
			},
			{
				name: 'Create Backup',
				value: 'createBackup',
				description: 'Start a manual backup of a database',
				action: 'Create dedicated database backup',
			},
			{
				name: 'Create Backup Policy',
				value: 'createBackupPolicy',
				description: 'Schedule recurring backups of a database',
				action: 'Create dedicated database backup policy',
			},
			{
				name: 'Create Branch',
				value: 'createBranch',
				description:
					'Create a temporary copy of a database, for example to test a schema migration',
				action: 'Create dedicated database branch',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a database and all its data permanently',
				action: 'Delete dedicated database',
			},
			{
				name: 'Delete Backup',
				value: 'deleteBackup',
				description: 'Delete a backup permanently',
				action: 'Delete dedicated database backup',
			},
			{
				name: 'Delete Backup Policy',
				value: 'deleteBackupPolicy',
				description:
					'Delete a backup policy. Backups it already took are kept until their retention ends.',
				action: 'Delete dedicated database backup policy',
			},
			{
				name: 'Delete Branch',
				value: 'deleteBranch',
				description: 'Delete a branch and its data permanently',
				action: 'Delete dedicated database branch',
			},
			{
				name: 'Execute SQL',
				value: 'executeSql',
				description: 'Run one SQL statement on a MySQL or PostgreSQL database',
				action: 'Execute SQL on dedicated database',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a database, including its connection credentials',
				action: 'Get dedicated database',
			},
			{
				name: 'Get Backup',
				value: 'getBackup',
				description: 'Get a backup of a database by ID',
				action: 'Get dedicated database backup',
			},
			{
				name: 'Get Backup Policy',
				value: 'getBackupPolicy',
				description: 'Get a backup policy of a database by ID',
				action: 'Get dedicated database backup policy',
			},
			{
				name: 'Get Connection Pooler',
				value: 'getPooler',
				description: 'Get the connection pooler settings of a MySQL or PostgreSQL database',
				action: 'Get dedicated database connection pooler',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List the databases of an engine, including their connection credentials',
				action: 'Get many dedicated databases',
			},
			{
				name: 'Get Many Backup Policies',
				value: 'getManyBackupPolicies',
				description: 'List the backup policies of a database',
				action: 'Get many dedicated database backup policies',
			},
			{
				name: 'Get Many Backups',
				value: 'getManyBackups',
				description: 'List the backups of a database, with optional filters',
				action: 'Get many dedicated database backups',
			},
			{
				name: 'Get Many Branches',
				value: 'getManyBranches',
				description: 'List the branches of a database, including their connection credentials',
				action: 'Get many dedicated database branches',
			},
			{
				name: 'Get Many Extensions',
				value: 'getManyExtensions',
				description: 'List the installed and available extensions of a PostgreSQL database',
				action: 'Get many dedicated database extensions',
			},
			{
				name: 'Get Many Operations',
				value: 'getManyOperations',
				description:
					'List the provisioning, update, backup, and restore operations run on a database, newest first',
				action: 'Get many dedicated database operations',
			},
			{
				name: 'Get Many Restorations',
				value: 'getManyRestorations',
				description: 'List the restorations of a database, with optional filters',
				action: 'Get many dedicated database restorations',
			},
			{
				name: 'Get Many Specifications',
				value: 'getManySpecifications',
				description:
					'List the compute specifications (CPU, memory, storage, and price) available on your plan',
				action: 'Get many dedicated database specifications',
			},
			{
				name: 'Get Recovery Window',
				value: 'getRecoveryWindow',
				description: 'Get the earliest and latest points in time a database can be restored to',
				action: 'Get dedicated database recovery window',
			},
			{
				name: 'Get Replicas',
				value: 'getReplicas',
				description: 'Get the high availability replicas of a database and their replication lag',
				action: 'Get dedicated database replicas',
			},
			{
				name: 'Get Restoration',
				value: 'getRestoration',
				description: 'Get a restoration of a database by ID',
				action: 'Get dedicated database restoration',
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				description: 'Get the live health, uptime, connections, and storage use of a database',
				action: 'Get dedicated database status',
			},
			{
				name: 'Install Extension',
				value: 'installExtension',
				description: 'Install an extension such as pgvector or PostGIS on a PostgreSQL database',
				action: 'Install dedicated database extension',
			},
			{
				name: 'Migrate',
				value: 'migrate',
				description:
					'Move a database between shared (serverless) and dedicated (always-on) hosting',
				action: 'Migrate dedicated database',
			},
			{
				name: 'Restore',
				value: 'restore',
				description: 'Restore a database from a backup or to a point in time',
				action: 'Restore dedicated database',
			},
			{
				name: 'Rotate Credentials',
				value: 'rotateCredentials',
				description:
					'Issue a new password for the primary user. The output is the rotation operation: once it completes, get the database to read the new password.',
				action: 'Rotate dedicated database credentials',
			},
			{
				name: 'Trigger Failover',
				value: 'triggerFailover',
				description: 'Promote a replica of a database to primary',
				action: 'Trigger dedicated database failover',
			},
			{
				name: 'Uninstall Extension',
				value: 'uninstallExtension',
				description: 'Uninstall an extension from a PostgreSQL database',
				action: 'Uninstall dedicated database extension',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the settings of a database, with zero downtime',
				action: 'Update dedicated database',
			},
			{
				name: 'Update Backup Policy',
				value: 'updateBackupPolicy',
				description: "Change a backup policy's name, schedule, retention, or enabled state",
				action: 'Update dedicated database backup policy',
			},
			{
				name: 'Update Backup Storage',
				value: 'updateBackupStorage',
				description:
					'Also store the backups of a database in your own S3, Google Cloud, or Azure bucket',
				action: 'Update dedicated database backup storage',
			},
			{
				name: 'Update Connection Pooler',
				value: 'updatePooler',
				description: 'Change the connection pooler settings of a MySQL or PostgreSQL database',
				action: 'Update dedicated database connection pooler',
			},
			{
				name: 'Update Maintenance Window',
				value: 'updateMaintenanceWindow',
				description: 'Set the weekly hour when maintenance such as minor version upgrades runs',
				action: 'Update dedicated database maintenance window',
			},
			{
				name: 'Upgrade Version',
				value: 'upgrade',
				description: 'Upgrade a database to a newer engine version, with a zero-downtime cutover',
				action: 'Upgrade dedicated database version',
			},
		],
		default: 'executeSql',
	},
];

const operationValues = (dedicatedDatabaseOperations[0].options as INodePropertyOptions[]).map(
	(option) => option.value as string,
);

const show = (operations: string[]) => ({ resource: [RESOURCE], operation: operations });

/**
 * The Database Engine selector, in one variant per group of operations that
 * the same engines offer. n8n cannot hide single Operation options, so an
 * operation only some engines have narrows this list instead: Execute SQL
 * offers MySQL and PostgreSQL, the extension operations PostgreSQL only.
 */
function engineProperties(): INodeProperties[] {
	const groups = new Map<string, string[]>();
	for (const operation of operationValues) {
		const key = enginesFor(operation)
			.map((engine) => engine.value)
			.join(',');
		groups.set(key, [...(groups.get(key) ?? []), operation]);
	}

	return [...groups.values()].map((operations) => {
		const engines = enginesFor(operations[0]);
		const description =
			engines.length === DATABASE_ENGINES.length
				? 'The engine of the database'
				: `The engine of the database. This operation is available for ${engines
						.map((engine) => engine.name)
						.join(' and ')} databases only.`;
		return {
			displayName: 'Database Engine',
			name: 'databaseEngine',
			type: 'options',
			required: true,
			options: engines.map(({ name, value }) => ({ name, value })),
			default: 'postgresql',
			description,
			displayOptions: { show: show(operations) },
		};
	});
}

/** Operations that act on no existing database. */
const ENGINE_LEVEL_OPERATIONS = ['create', 'getMany', 'getManySpecifications'];

/** The engines with an SQL API, whose settings MongoDB databases do not show. */
const SQL_ENGINES = enginesFor('executeSql').map((engine) => engine.value);

/** An ID field for the new record of a create operation. */
function customIdProperty(
	name: string,
	displayName: string,
	record: string,
	operation: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description: `The ID for the ${record}. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.`,
		displayOptions: { show: show([operation]) },
	};
}

/**
 * Settings shared by Create (as options) and Update (as update fields), named
 * as the API names them. Update-only ones are listed in UPDATE_ONLY_SETTINGS,
 * and Version applies on create only.
 */
const DATABASE_SETTINGS: INodeProperties[] = [
	{
		displayName: 'Connection Idle Timeout (Seconds)',
		name: 'networkIdleTimeoutSeconds',
		type: 'number',
		typeOptions: { minValue: 60, maxValue: 86400 },
		default: 900,
		description: 'Seconds before an idle client connection is closed, from 60 to 86400',
	},
	{
		displayName: 'High Availability Replicas',
		name: 'replicas',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 5 },
		default: 0,
		description:
			'The number of standby replicas, from 0 to 5. High availability is on when this is above 0.',
	},
	{
		displayName: 'IP Allowlist',
		name: 'networkIPAllowlist',
		type: 'string',
		default: '',
		placeholder: 'e.g. 203.0.113.7, 198.51.100.0/24',
		description:
			'IP addresses or CIDR ranges allowed to connect, as a comma-separated list or a JSON array',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The display name of the database. Max length: 128 characters.',
	},
	{
		displayName: 'Point-in-Time Recovery',
		name: 'pitr',
		type: 'boolean',
		default: true,
		description:
			'Whether to archive changes continuously, so the database can be restored to any moment within the retention period',
	},
	{
		displayName: 'Point-in-Time Recovery Retention (Days)',
		name: 'pitrRetentionDays',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 7,
		description: 'Days to keep point-in-time recovery data',
	},
	{
		displayName: 'Scale to Zero After (Minutes)',
		name: 'idleTimeoutMinutes',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 15,
		description: 'Minutes without activity before the database scales to zero',
	},
	{
		displayName: 'Slow Query Threshold (Milliseconds)',
		name: 'metricsSlowQueryLogThresholdMs',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 1000,
		description: 'Queries that run longer than this are logged as slow',
	},
	{
		displayName: 'Specification',
		name: 'specification',
		type: 'string',
		default: 's-1vcpu-1gb',
		placeholder: 'e.g. s-1vcpu-1gb',
		description:
			'The slug of the compute specification, which sets the CPU, memory, storage, and connection limit. Get Many Specifications lists the ones your plan offers.',
	},
	{
		displayName: 'SQL API',
		name: 'sqlApiEnabled',
		type: 'boolean',
		default: true,
		description: 'Whether the SQL API that Execute SQL uses is enabled',
		displayOptions: { show: { '/databaseEngine': SQL_ENGINES } },
	},
	{
		displayName: 'SQL API Allowed Statements',
		name: 'sqlApiAllowedStatements',
		type: 'multiOptions',
		options: [
			{ name: 'ALTER', value: 'ALTER' },
			{ name: 'CREATE', value: 'CREATE' },
			{ name: 'DELETE', value: 'DELETE' },
			{ name: 'DROP', value: 'DROP' },
			{ name: 'GRANT', value: 'GRANT' },
			{ name: 'INSERT', value: 'INSERT' },
			{ name: 'REVOKE', value: 'REVOKE' },
			{ name: 'SELECT', value: 'SELECT' },
			{ name: 'TRUNCATE', value: 'TRUNCATE' },
			{ name: 'UPDATE', value: 'UPDATE' },
		],
		default: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
		description:
			'The statement types Execute SQL accepts, replacing the current list. Appwrite allows SELECT, INSERT, UPDATE, and DELETE by default.',
		displayOptions: { show: { '/databaseEngine': SQL_ENGINES } },
	},
	{
		displayName: 'SQL API Max Result Size (Bytes)',
		name: 'sqlApiMaxBytes',
		type: 'number',
		typeOptions: { minValue: 1024, maxValue: 104857600 },
		default: 10485760,
		description:
			'The largest result Execute SQL returns, from 1024 to 104857600 bytes. Larger results are truncated.',
		displayOptions: { show: { '/databaseEngine': SQL_ENGINES } },
	},
	{
		displayName: 'SQL API Max Rows',
		name: 'sqlApiMaxRows',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 1000000 },
		default: 1000,
		description:
			'The most rows Execute SQL returns, from 1 to 1000000. Larger results are truncated.',
		displayOptions: { show: { '/databaseEngine': SQL_ENGINES } },
	},
	{
		displayName: 'SQL API Timeout (Seconds)',
		name: 'sqlApiTimeoutSeconds',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 300 },
		default: 30,
		description: 'Seconds Execute SQL lets a statement run before cancelling it, from 1 to 300',
		displayOptions: { show: { '/databaseEngine': SQL_ENGINES } },
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{
				name: 'Inactive',
				value: 'inactive',
				description: 'Spin down a shared database',
			},
			{
				name: 'Paused',
				value: 'paused',
				description: 'Pause the database',
			},
			{
				name: 'Ready',
				value: 'ready',
				description:
					'Resume a paused database, or recover a failed one whose infrastructure is healthy',
			},
		],
		default: 'ready',
		description: 'Pause or resume the database',
	},
	{
		displayName: 'Storage Autoscaling',
		name: 'storageAutoscaling',
		type: 'boolean',
		default: true,
		description: 'Whether to grow the storage automatically when its use passes the threshold',
	},
	{
		displayName: 'Storage Autoscaling Limit (GB)',
		name: 'storageAutoscalingMaxGb',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 16384 },
		default: 0,
		description:
			"The largest size in GB autoscaling may grow the storage to, or 0 for no limit. Without this option, the limit is 3 times the specification's storage.",
	},
	{
		displayName: 'Storage Autoscaling Threshold (%)',
		name: 'storageAutoscalingThresholdPercent',
		type: 'number',
		typeOptions: { minValue: 50, maxValue: 95 },
		default: 85,
		description: 'The storage use, from 50 to 95 percent, that triggers autoscaling',
	},
	{
		displayName: 'Sync Mode',
		name: 'syncMode',
		type: 'options',
		options: [
			{
				name: 'Asynchronous',
				value: 'async',
				description: 'Fastest: the primary does not wait for replicas to confirm writes',
			},
			{
				name: 'Quorum',
				value: 'quorum',
				description: 'A majority of replicas must confirm each write',
			},
			{
				name: 'Synchronous',
				value: 'sync',
				description: 'Strong consistency: replicas must confirm each write',
			},
		],
		default: 'async',
		description: 'How replicas confirm writes',
	},
	{
		displayName: 'Trace Sample Rate',
		name: 'metricsTraceSampleRate',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
		default: 0,
		description: 'The fraction of queries to trace, from 0 to 1',
	},
	{
		displayName: 'Version',
		name: 'version',
		type: 'string',
		default: '',
		placeholder: 'e.g. 17',
		description: 'The engine version. Defaults to the latest version of the engine.',
	},
];

const UPDATE_ONLY_SETTINGS = [
	'metricsSlowQueryLogThresholdMs',
	'metricsTraceSampleRate',
	'name',
	'sqlApiAllowedStatements',
	'sqlApiEnabled',
	'sqlApiMaxBytes',
	'sqlApiMaxRows',
	'sqlApiTimeoutSeconds',
	'status',
];

/** Pooler overrides that fall back to a default proportional to the database when left empty. */
const poolerQuantity = (
	displayName: string,
	name: string,
	placeholder: string,
	description: string,
): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	default: '',
	placeholder,
	description,
});

export const dedicatedDatabaseFields: INodeProperties[] = [
	...engineProperties(),
	resourceLocator(
		{
			name: 'dedicatedDatabaseId',
			displayName: 'Database',
			kind: 'database',
			searchListMethod: 'searchDedicatedDatabases',
			placeholder: 'e.g. orders',
			urlPlaceholder:
				'e.g. https://cloud.appwrite.io/console/project-fra-myproject/databases/database-orders',
			dependsOn: ['databaseEngine'],
			description: 'The database to use',
		},
		show(operationValues.filter((operation) => !ENGINE_LEVEL_OPERATIONS.includes(operation))),
	),

	// Create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The display name of the database. Max length: 128 characters.',
		displayOptions: { show: show(['create']) },
	},
	customIdProperty('dedicatedDatabaseId', 'Database ID', 'database', 'create'),

	// Sub-records of a database
	{
		displayName: 'Backup ID',
		name: 'backupId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the backup',
		displayOptions: { show: show(['deleteBackup', 'getBackup']) },
	},
	{
		displayName: 'Backup Policy ID',
		name: 'backupPolicyId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the backup policy',
		displayOptions: {
			show: show(['deleteBackupPolicy', 'getBackupPolicy', 'updateBackupPolicy']),
		},
	},
	{
		displayName: 'Branch ID',
		name: 'branchId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the branch',
		displayOptions: { show: show(['deleteBranch']) },
	},
	{
		displayName: 'Restoration ID',
		name: 'restorationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the restoration',
		displayOptions: { show: show(['getRestoration']) },
	},

	// Create Backup
	{
		displayName: 'Backup Type',
		name: 'backupType',
		type: 'options',
		options: [
			{ name: 'Full', value: 'full', description: 'A complete snapshot of the database' },
			{
				name: 'Incremental',
				value: 'incremental',
				description: 'Only the changes since the last backup',
			},
		],
		default: 'full',
		description: 'The kind of backup to take',
		displayOptions: { show: show(['createBackup']) },
	},

	// Create Backup Policy
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the backup policy. Max length: 128 characters.',
		displayOptions: { show: show(['createBackupPolicy']) },
	},
	{
		displayName: 'Schedule',
		name: 'backupSchedule',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 0 3 * * *',
		description: 'When to take backups, in CRON syntax',
		displayOptions: { show: show(['createBackupPolicy']) },
	},
	{
		displayName: 'Retention (Days)',
		name: 'backupRetentionDays',
		type: 'number',
		typeOptions: { minValue: 1 },
		required: true,
		default: 7,
		description: 'Days to keep each backup before it is deleted',
		displayOptions: { show: show(['createBackupPolicy']) },
	},
	customIdProperty('backupPolicyId', 'Backup Policy ID', 'backup policy', 'createBackupPolicy'),

	// Create Branch
	customIdProperty('branchId', 'Branch ID', 'branch', 'createBranch'),

	// Execute SQL: one variant per engine, for the SQL editor's dialect.
	...[
		{ engine: 'mysql', dialect: 'MySQL' as const, placeholders: '?', example: '?' },
		{ engine: 'postgresql', dialect: 'PostgreSQL' as const, placeholders: '$1, $2', example: '$1' },
	].map(({ engine, dialect, placeholders, example }): INodeProperties => ({
		displayName: 'SQL Statement',
		name: 'sqlStatement',
		type: 'string',
		typeOptions: { editor: 'sqlEditor', sqlDialect: dialect },
		required: true,
		default: '',
		placeholder: `e.g. SELECT * FROM orders WHERE status = ${example}`,
		description:
			"One SQL statement to run. Its type (SELECT, INSERT, and so on) must be allowed by the database's SQL API settings.",
		hint: `Pass values in Bindings (under Options) and reference them as ${placeholders} rather than writing them into the statement`,
		displayOptions: { show: { ...show(['executeSql']), databaseEngine: [engine] } },
	})),

	// Extensions
	{
		displayName: 'Extension Name or ID',
		name: 'extensionName',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getAvailablePostgresqlExtensions',
			loadOptionsDependsOn: ['dedicatedDatabaseId.value'],
		},
		required: true,
		default: '',
		description:
			'The extension to install, e.g. pgvector, postgis, or uuid-ossp. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: show(['installExtension']) },
	},
	{
		displayName: 'Extension Name or ID',
		name: 'extensionName',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getInstalledPostgresqlExtensions',
			loadOptionsDependsOn: ['dedicatedDatabaseId.value'],
		},
		required: true,
		default: '',
		description:
			'The installed extension to uninstall. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: show(['uninstallExtension']) },
	},

	// Migrate
	{
		displayName: 'Target Type',
		name: 'migrationTargetType',
		type: 'options',
		options: [
			{
				name: 'Dedicated',
				value: 'dedicated',
				description: 'Always on, with persistent resources',
			},
			{
				name: 'Shared',
				value: 'shared',
				description: 'Serverless: scales to zero when idle',
			},
		],
		required: true,
		default: 'dedicated',
		description:
			'The hosting to move the database to. The data is copied over, with a brief read-only window during the cutover.',
		displayOptions: { show: show(['migrate']) },
	},

	// Restore
	{
		displayName: 'Restore From',
		name: 'restorationType',
		type: 'options',
		options: [
			{ name: 'Backup', value: 'backup', description: 'A backup of the database' },
			{
				name: 'Point in Time',
				value: 'pitr',
				description:
					'Any moment in the recovery window. Needs point-in-time recovery, which is available for enterprise databases.',
			},
		],
		default: 'backup',
		description: 'What to restore the database from',
		displayOptions: { show: show(['restore']) },
	},
	{
		displayName: 'Backup ID',
		name: 'backupId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the backup to restore from',
		displayOptions: { show: { ...show(['restore']), restorationType: ['backup'] } },
	},
	{
		displayName: 'Point in Time',
		name: 'restorationTargetTime',
		type: 'dateTime',
		required: true,
		default: '',
		description:
			'The moment to restore the database to. Get Recovery Window returns the earliest and latest possible points.',
		displayOptions: { show: { ...show(['restore']), restorationType: ['pitr'] } },
	},

	// Update Backup Storage
	{
		displayName: 'Provider',
		name: 'backupStorageProvider',
		type: 'options',
		options: [
			{ name: 'Amazon S3 or S3-Compatible', value: 's3' },
			{ name: 'Azure Blob Storage', value: 'azure' },
			{ name: 'Google Cloud Storage', value: 'gcs' },
		],
		required: true,
		default: 's3',
		description: 'Where to store the backups, in addition to the storage Appwrite keeps them in',
		displayOptions: { show: show(['updateBackupStorage']) },
	},
	{
		displayName: 'Bucket',
		name: 'backupStorageBucket',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the bucket or container to store the backups in',
		displayOptions: { show: show(['updateBackupStorage']) },
	},
	{
		displayName: 'Access Key',
		name: 'backupStorageAccessKey',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The access key or client ID to authenticate with',
		displayOptions: { show: show(['updateBackupStorage']) },
	},
	{
		displayName: 'Secret Key',
		name: 'backupStorageSecretKey',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			'The secret key to authenticate with, or the service account JSON for Google Cloud Storage',
		displayOptions: { show: show(['updateBackupStorage']) },
	},

	// Update Maintenance Window
	{
		displayName: 'Day',
		name: 'maintenanceDay',
		type: 'options',
		options: [
			{ name: 'Friday', value: 'fri' },
			{ name: 'Monday', value: 'mon' },
			{ name: 'Saturday', value: 'sat' },
			{ name: 'Sunday', value: 'sun' },
			{ name: 'Thursday', value: 'thu' },
			{ name: 'Tuesday', value: 'tue' },
			{ name: 'Wednesday', value: 'wed' },
		],
		required: true,
		default: 'sun',
		description: 'The day of the week the maintenance window starts on',
		displayOptions: { show: show(['updateMaintenanceWindow']) },
	},
	{
		displayName: 'Hour (UTC)',
		name: 'maintenanceHourUtc',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 23 },
		required: true,
		default: 0,
		description: 'The hour, from 0 to 23 in UTC, the maintenance window starts at',
		displayOptions: { show: show(['updateMaintenanceWindow']) },
	},

	// Upgrade Version
	{
		displayName: 'Target Version',
		name: 'targetVersion',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 18',
		description: 'The engine version to upgrade to',
		displayOptions: { show: show(['upgrade']) },
	},

	// Get Many
	...returnAllAndLimitProperties(RESOURCE, [
		'getMany',
		'getManyBackupPolicies',
		'getManyBackups',
		'getManyOperations',
		'getManyRestorations',
	]),
	...queriesProperties(RESOURCE, ['getMany', 'getManyBackupPolicies', 'getManyBackups']),
	simplifyProperty(RESOURCE, [
		'get',
		'getBackup',
		'getBackupPolicy',
		'getMany',
		'getManyBackupPolicies',
		'getManyBackups',
		'getManyBranches',
		'getManyOperations',
		'getManyRestorations',
		'getManySpecifications',
		'getRestoration',
		'getStatus',
	]),

	// Optional settings, one collection per operation
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['create']) },
		options: DATABASE_SETTINGS.filter((setting) => !UPDATE_ONLY_SETTINGS.includes(setting.name)),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['createBackupPolicy']) },
		options: [
			{
				displayName: 'Backup Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Full', value: 'full', description: 'A complete snapshot of the database' },
					{
						name: 'Incremental',
						value: 'incremental',
						description: 'Only the changes since the last backup',
					},
				],
				default: 'full',
				description: 'The kind of backup the policy takes',
			},
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description: 'Whether the policy takes backups',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['createBranch']) },
		options: [
			{
				displayName: 'Time to Live (Seconds)',
				name: 'ttl',
				type: 'number',
				typeOptions: { minValue: 300, maxValue: 604800 },
				default: 86400,
				description:
					'Seconds until the branch expires and is deleted, from 300 (5 minutes) to 604800 (7 days)',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['executeSql']) },
		options: [
			{
				displayName: 'Bindings',
				name: 'bindings',
				type: 'json',
				default: '[]',
				description:
					"Values for the statement's placeholders: a JSON array in placeholder order, or a JSON object for named placeholders. They are sent separately from the SQL and never interpolated into it.",
			},
			{
				displayName: 'Output',
				name: 'output',
				type: 'options',
				options: [
					{
						name: 'Full Response',
						value: 'fullResponse',
						description:
							'One item with the rows, column types, and execution statistics, even for a truncated result',
					},
					{
						name: 'Rows',
						value: 'rows',
						description:
							'One item per row. A statement without a result set, such as an UPDATE, outputs one item with its affected row count.',
					},
				],
				default: 'rows',
				description: 'What to output',
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeoutSeconds',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 300 },
				default: 30,
				description:
					"Seconds to let the statement run before cancelling it. Cannot exceed the database's SQL API timeout, which applies without this option.",
			},
		],
	},
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
				default: 'completed',
				description: 'Return only operations with this status',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['getManyRestorations']) },
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Completed', value: 'completed' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Pending', value: 'pending' },
					{ name: 'Running', value: 'running' },
				],
				default: 'completed',
				description: 'Return only restorations with this status',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Backup', value: 'backup' },
					{ name: 'Point in Time', value: 'pitr' },
				],
				default: 'backup',
				description: 'Return only restorations of this type',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { ...show(['migrate']), migrationTargetType: ['dedicated'] } },
		options: [
			{
				displayName: 'Specification',
				name: 'specification',
				type: 'string',
				default: '',
				placeholder: 'e.g. s-2vcpu-4gb',
				description:
					"The slug of the compute specification to provision. Defaults to the database's current specification.",
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['restore']) },
		options: [
			{
				displayName: 'Target Database ID',
				name: 'targetDatabaseId',
				type: 'string',
				default: '',
				description:
					'Restore into this other database instead of the one above. It must be ready and run the same engine and version.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['triggerFailover']) },
		options: [
			{
				displayName: 'Target Replica ID',
				name: 'targetReplicaId',
				type: 'string',
				default: '',
				description:
					'The replica to promote. Without this option, Appwrite promotes the healthiest one. Needed to repair a failover, failed database, upgrade, migration, or resize that did not finish.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['updateBackupStorage']) },
		options: [
			{
				displayName: 'Endpoint',
				name: 'endpoint',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://minio.example.com',
				description: 'A custom endpoint, for S3-compatible storage such as MinIO',
			},
			{
				displayName: 'Prefix',
				name: 'prefix',
				type: 'string',
				default: 'backups/',
				description: 'The object key prefix for the backups',
			},
			{
				displayName: 'Region',
				name: 'region',
				type: 'string',
				default: '',
				placeholder: 'e.g. eu-central-1',
				description: 'The region of the bucket',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: show(['update']) },
		options: DATABASE_SETTINGS.filter((setting) => setting.name !== 'version'),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: show(['updateBackupPolicy']) },
		options: [
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description: 'Whether the policy takes backups',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the backup policy. Max length: 128 characters.',
			},
			{
				displayName: 'Retention (Days)',
				name: 'retention',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 7,
				description: 'Days to keep each backup before it is deleted',
			},
			{
				displayName: 'Schedule',
				name: 'schedule',
				type: 'string',
				default: '',
				placeholder: 'e.g. 0 3 * * *',
				description: 'When to take backups, in CRON syntax',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: show(['updatePooler']) },
		options: [
			poolerQuantity(
				'CPU Limit',
				'poolerCpuLimit',
				'e.g. 500m',
				'The CPU limit of the pooler, as a Kubernetes quantity. Changing it restarts the database. Leave empty for the default: 10% of the database CPU, at least 200m.',
			),
			poolerQuantity(
				'CPU Request',
				'poolerCpuRequest',
				'e.g. 250m',
				'The CPU reserved for the pooler, as a Kubernetes quantity. Leave empty for the default: 5% of the database CPU, at least 100m.',
			),
			{
				displayName: 'Default Pool Size',
				name: 'defaultPoolSize',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 20,
				description: 'The number of database connections the pooler keeps per user',
			},
			{
				displayName: 'Max Client Connections',
				name: 'maxConnections',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 100,
				description:
					"The most client connections the pooler accepts. PostgreSQL's pooler has no such limit.",
				displayOptions: { show: { '/databaseEngine': ['mysql'] } },
			},
			poolerQuantity(
				'Memory Limit',
				'poolerMemoryLimit',
				'e.g. 256Mi',
				'The memory limit of the pooler, as a Kubernetes quantity. Changing it restarts the database. Leave empty for the default: 15% of the database memory, at least 128Mi.',
			),
			poolerQuantity(
				'Memory Request',
				'poolerMemoryRequest',
				'e.g. 128Mi',
				'The memory reserved for the pooler, as a Kubernetes quantity. Leave empty for the default: 7.5% of the database memory, at least 64Mi.',
			),
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Session',
						value: 'session',
						description: 'Hold a database connection for the whole client session',
					},
					{
						name: 'Transaction',
						value: 'transaction',
						description: 'Return the connection to the pool after each transaction',
					},
				],
				default: 'transaction',
				description: 'When the pooler hands a database connection back',
			},
			{
				displayName: 'Read/Write Splitting',
				name: 'readWriteSplitting',
				type: 'boolean',
				default: true,
				description:
					'Whether to send reads to the high availability replicas and writes to the primary. Takes effect only when the database has replicas.',
			},
		],
	},
];
