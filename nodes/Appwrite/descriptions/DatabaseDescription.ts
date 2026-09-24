import type { INodeProperties } from 'n8n-workflow';

import { databaseLocator } from './locators';
import {
	listOptionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	simplifyProperty,
} from './shared';

export const databaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['database'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new database',
				action: 'Create database',
			},
			{
				name: 'Create Cutover',
				value: 'createCutover',
				description:
					'Switch a verified migration over to its dedicated compute, for migrations created with Auto Cutover off',
				action: 'Create database migration cutover',
			},
			{
				name: 'Create Migration',
				value: 'createMigration',
				description: 'Start moving a serverless database onto dedicated compute',
				action: 'Create database migration',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a database and all its tables',
				action: 'Delete database',
			},
			{
				name: 'Delete Migration',
				value: 'deleteMigration',
				description: 'Abort a migration to dedicated compute before it cuts over',
				action: 'Delete database migration',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single database by its ID',
				action: 'Get database',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List databases in the project',
				action: 'Get many databases',
			},
			{
				name: 'Get Many Migrations',
				value: 'getManyMigrations',
				description: 'List the migrations of a database to dedicated compute',
				action: 'Get many database migrations',
			},
			{
				name: 'Get Many Operations',
				value: 'getManyOperations',
				description:
					'List the lifecycle operations (provisioning, updates, backups, failovers, and more) of a dedicated database, newest first',
				action: 'Get many database operations',
			},
			{
				name: 'Get Many Specifications',
				value: 'getManySpecifications',
				description:
					'List the dedicated database specifications with their resources and prices, and whether your plan offers them',
				action: 'Get many database specifications',
			},
			{
				name: 'Get Migration',
				value: 'getMigration',
				description: 'Get the progress of a migration to dedicated compute',
				action: 'Get database migration',
			},
			{
				name: 'Get Replicas',
				value: 'getReplicas',
				description:
					'Get the high availability state of a dedicated database: its replicas, their replication status, and the sync mode',
				action: 'Get database replicas',
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				description:
					'Get the real-time health of a dedicated database: readiness, uptime, connections, replicas, and storage volumes',
				action: 'Get database status',
			},
			{
				name: 'Trigger Failover',
				value: 'createFailover',
				description: 'Promote a replica of a dedicated database with high availability to primary',
				action: 'Trigger database failover',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Rename a database or change whether it is enabled',
				action: 'Update database',
			},
		],
		default: 'getMany',
	},
];

export const databaseFields: INodeProperties[] = [
	databaseLocator({
		resource: ['database'],
		operation: [
			'createCutover',
			'createFailover',
			'createMigration',
			'delete',
			'deleteMigration',
			'get',
			'getManyMigrations',
			'getManyOperations',
			'getMigration',
			'getReplicas',
			'getStatus',
			'update',
		],
	}),
	{
		displayName: 'Migration ID',
		name: 'databaseMigrationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the migration, as returned by Create Migration or Get Many Migrations',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['createCutover', 'deleteMigration', 'getMigration'],
			},
		},
	},
	{
		displayName: 'Specification',
		name: 'databaseSpecification',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. s-2vcpu-4gb',
		description:
			'The slug of the dedicated compute specification to move the database onto, as listed by Get Many Specifications',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['createMigration'],
			},
		},
	},
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'string',
		default: '',
		description:
			'The ID for the new database. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name for the database, up to 128 characters',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description:
			'Whether the database is enabled. When disabled, users cannot access it, but server SDKs with an API key still can. Defaults to true.',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description:
					'Whether the database is enabled. When disabled, users cannot access it, but server SDKs with an API key still can. Leave this out to keep the current setting.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['createFailover'],
			},
		},
		options: [
			{
				displayName: 'Target Replica ID',
				name: 'targetReplicaId',
				type: 'string',
				default: '',
				description:
					'The replica to promote to primary. Leave empty to promote the healthiest replica. Required when repairing a failed database or an operation that did not finish.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['createMigration'],
			},
		},
		options: [
			{
				displayName: 'Auto Cutover',
				name: 'autoCutover',
				type: 'boolean',
				default: true,
				description:
					'Whether to switch over to the dedicated compute as soon as the copied data is verified. Turn off to hold the migration at Ready to Cutover until you run Create Cutover.',
			},
		],
	},
	...returnAllAndLimitProperties('database', ['getMany', 'getManyOperations']),
	...queriesProperties('database', ['getMany']),
	simplifyProperty('database', [
		'get',
		'getMany',
		'getManyMigrations',
		'getManyOperations',
		'getManySpecifications',
		'getMigration',
		'getStatus',
	]),
	listOptionsProperty('database', ['getMany']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['getManyOperations'],
			},
		},
		options: [
			{
				displayName: 'Status',
				name: 'operationStatus',
				type: 'options',
				options: [
					{ name: 'Completed', value: 'completed' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Queued', value: 'queued' },
					{ name: 'Running', value: 'running' },
				],
				default: 'failed',
				description: 'Return only operations with this status',
			},
		],
	},
];
