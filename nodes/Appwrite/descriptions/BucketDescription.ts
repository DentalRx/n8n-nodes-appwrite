import type { INodeProperties } from 'n8n-workflow';

import {
	listOptionsProperty,
	permissionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	simplifyProperty,
} from './shared';

export const bucketOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new storage bucket',
				action: 'Create bucket',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a storage bucket and all its files permanently',
				action: 'Delete bucket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single storage bucket by its ID',
				action: 'Get bucket',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List storage buckets, with optional filters',
				action: 'Get many buckets',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the settings of an existing storage bucket',
				action: 'Update bucket',
			},
		],
		default: 'get',
	},
];

export const bucketFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name or ID',
		name: 'bucketId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getBuckets' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},
	{
		displayName: 'Bucket ID',
		name: 'bucketId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the bucket. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['bucket'],
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
		description: 'The name of the bucket',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['create', 'update'],
			},
		},
	},
	permissionsProperty('bucket', ['create', 'update']),
	...returnAllAndLimitProperties('bucket', ['getMany']),
	...queriesProperties('bucket', ['getMany']),
	simplifyProperty('bucket', ['get', 'getMany']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Allowed File Extensions',
				name: 'allowedFileExtensions',
				type: 'string',
				default: '',
				placeholder: 'e.g. jpg, png, pdf',
				description:
					'Allowed file extensions as a comma-separated list or a JSON array. Maximum of 100 extensions, each up to 64 characters long.',
			},
			{
				displayName: 'Antivirus',
				name: 'antivirus',
				type: 'boolean',
				default: true,
				description:
					'Whether virus scanning is enabled. For files above 20MB, antivirus scanning is skipped even if enabled.',
			},
			{
				displayName: 'Compression',
				name: 'compression',
				type: 'options',
				options: [
					{
						name: 'Gzip',
						value: 'gzip',
					},
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Zstd',
						value: 'zstd',
					},
				],
				default: 'none',
				description:
					'Compression algorithm to use for stored files. For files above 20MB, compression is skipped even if enabled.',
			},
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description:
					'Whether the bucket is enabled. When disabled, users cannot access the files, but server SDKs with an API key still can.',
			},
			{
				displayName: 'Encryption',
				name: 'encryption',
				type: 'boolean',
				default: true,
				description:
					'Whether encryption is enabled. For files above 20MB, encryption is skipped even if enabled.',
			},
			{
				displayName: 'File Security',
				name: 'fileSecurity',
				type: 'boolean',
				default: false,
				description:
					'Whether to enable permissions for individual files. A user needs one of file or bucket level permissions to access a file.',
			},
			{
				displayName: 'Maximum File Size',
				name: 'maximumFileSize',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 30000000,
				description: 'Maximum file size allowed in bytes. Defaults to 30000000 (30MB).',
			},
			{
				displayName: 'Transformations',
				name: 'transformations',
				type: 'boolean',
				default: true,
				description:
					'Whether image transformations (such as Get Preview resizing and format conversion) are enabled for files in the bucket',
			},
		],
	},
	listOptionsProperty('bucket', ['getMany']),
];
