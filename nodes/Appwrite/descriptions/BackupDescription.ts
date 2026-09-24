import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties, simplifyProperty } from './shared';

export const backupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['backup'],
			},
		},
		options: [
			{
				name: 'Create Archive',
				value: 'createArchive',
				description: 'Back up now, outside any policy schedule',
				action: 'Create backup archive',
			},
			{
				name: 'Create Policy',
				value: 'createPolicy',
				description: 'Schedule recurring backups',
				action: 'Create backup policy',
			},
			{
				name: 'Create Restoration',
				value: 'createRestoration',
				description: 'Restore data from a backup archive',
				action: 'Create backup restoration',
			},
			{
				name: 'Delete Archive',
				value: 'deleteArchive',
				description: 'Delete a backup archive permanently',
				action: 'Delete backup archive',
			},
			{
				name: 'Delete Policy',
				value: 'deletePolicy',
				description: 'Delete a backup policy, stopping its scheduled backups',
				action: 'Delete backup policy',
			},
			{
				name: 'Get Archive',
				value: 'getArchive',
				description: 'Retrieve a single backup archive by its ID',
				action: 'Get backup archive',
			},
			{
				name: 'Get Many Archives',
				value: 'getManyArchives',
				description: 'List backup archives, with optional filters',
				action: 'Get many backup archives',
			},
			{
				name: 'Get Many Policies',
				value: 'getManyPolicies',
				description: 'List backup policies, with optional filters',
				action: 'Get many backup policies',
			},
			{
				name: 'Get Many Restorations',
				value: 'getManyRestorations',
				description: 'List backup restorations, with optional filters',
				action: 'Get many backup restorations',
			},
			{
				name: 'Get Policy',
				value: 'getPolicy',
				description: 'Retrieve a single backup policy by its ID',
				action: 'Get backup policy',
			},
			{
				name: 'Get Restoration',
				value: 'getRestoration',
				description: 'Retrieve a single restoration, including its status, by its ID',
				action: 'Get backup restoration',
			},
			{
				name: 'Update Policy',
				value: 'updatePolicy',
				description: 'Change the name, schedule, retention, or status of a backup policy',
				action: 'Update backup policy',
			},
		],
		default: 'getManyArchives',
	},
];

const GET_MANY_OPERATIONS = ['getManyArchives', 'getManyPolicies', 'getManyRestorations'];

const RESOURCE_ID_OPTION: INodeProperties = {
	displayName: 'Resource ID',
	name: 'resourceId',
	type: 'string',
	default: '',
	placeholder: 'e.g. main',
	description:
		'The ID of the one resource to back up, e.g. a database ID. Leave empty to back up every resource of the chosen services.',
};

const SCHEDULE_DESCRIPTION = 'When to back up, as a CRON expression';

const RETENTION_DESCRIPTION = 'How many days Appwrite keeps each backup before deleting it';

export const backupFields: INodeProperties[] = [
	{
		displayName: 'Archive ID',
		name: 'archiveId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the backup archive',
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['createRestoration', 'deleteArchive', 'getArchive'],
			},
		},
	},
	{
		displayName: 'Policy ID',
		name: 'policyId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the backup policy',
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['deletePolicy', 'getPolicy', 'updatePolicy'],
			},
		},
	},
	{
		displayName: 'Restoration ID',
		name: 'restorationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the restoration',
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['getRestoration'],
			},
		},
	},
	{
		displayName: 'Services',
		name: 'backupServices',
		type: 'multiOptions',
		required: true,
		options: [
			{ name: 'Databases', value: 'databases' },
			{ name: 'Dedicated Databases', value: 'dedicatedDatabases' },
			{ name: 'DocumentsDB', value: 'documentsdb' },
			{ name: 'Functions', value: 'functions' },
			{ name: 'Storage', value: 'storage' },
			{ name: 'TablesDB', value: 'tablesdb' },
			{ name: 'VectorsDB', value: 'vectorsdb' },
		],
		default: [],
		description: 'The services whose data to back up or restore',
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['createArchive', 'createPolicy', 'createRestoration'],
			},
		},
	},
	{
		displayName: 'Retention (Days)',
		name: 'backupRetention',
		type: 'number',
		typeOptions: { minValue: 1 },
		required: true,
		default: 7,
		description: RETENTION_DESCRIPTION,
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['createPolicy'],
			},
		},
	},
	{
		displayName: 'Schedule',
		name: 'backupSchedule',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 0 2 * * *',
		description: SCHEDULE_DESCRIPTION,
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['createPolicy'],
			},
		},
	},
	{
		displayName: 'Policy ID',
		name: 'policyId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the policy. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['createPolicy'],
			},
		},
	},
	...returnAllAndLimitProperties('backup', GET_MANY_OPERATIONS),
	...queriesProperties('backup', GET_MANY_OPERATIONS),
	simplifyProperty('backup', [
		'getArchive',
		'getManyArchives',
		'getManyPolicies',
		'getManyRestorations',
		'getPolicy',
		'getRestoration',
	]),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['createArchive'],
			},
		},
		options: [RESOURCE_ID_OPTION],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['createPolicy'],
			},
		},
		options: [
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description: 'Whether the policy takes backups. When disabled, its schedule is paused.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the policy. Max length: 128 characters.',
			},
			RESOURCE_ID_OPTION,
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
				resource: ['backup'],
				operation: ['createRestoration'],
			},
		},
		options: [
			{
				displayName: 'New Resource ID',
				name: 'newResourceId',
				type: 'string',
				default: '',
				description:
					'Restore into a new resource with this ID, next to the archived one. Leave empty to restore the archived resource in place.',
			},
			{
				displayName: 'New Resource Name',
				name: 'newResourceName',
				type: 'string',
				default: '',
				description: 'The name for the new resource, when restoring a database into a new one',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['updatePolicy'],
			},
		},
		options: [
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description: 'Whether the policy takes backups. When disabled, its schedule is paused.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the policy. Max length: 128 characters.',
			},
			{
				displayName: 'Retention (Days)',
				name: 'retention',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 7,
				description: RETENTION_DESCRIPTION,
			},
			{
				displayName: 'Schedule',
				name: 'schedule',
				type: 'string',
				default: '',
				placeholder: 'e.g. 0 2 * * *',
				description: SCHEDULE_DESCRIPTION,
			},
		],
	},
];
