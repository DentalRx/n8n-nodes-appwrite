import type { INodeProperties } from 'n8n-workflow';

import { userLocator } from './locators';
import { permissionsProperty, queriesProperties, returnAllAndLimitProperties } from './shared';

export const presenceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['presence'],
			},
		},
		options: [
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update presence',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a presence entry, marking the user as no longer present',
				action: 'Delete presence',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single presence entry by its ID',
				action: 'Get presence',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List current presence entries, with optional filters',
				action: 'Get many presences',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the status, expiry, metadata, or permissions of a presence entry',
				action: 'Update presence',
			},
		],
		default: 'getMany',
	},
];

export const presenceFields: INodeProperties[] = [
	{
		displayName: 'Presence ID',
		name: 'presenceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the presence entry. Expired entries count as not found.',
		displayOptions: {
			show: {
				resource: ['presence'],
				operation: ['delete', 'get', 'update'],
			},
		},
	},
	{
		displayName: 'Presence ID',
		name: 'presenceId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID of the presence entry to create or update. Leave empty (or use unique()) to create a new entry with a generated ID.',
		displayOptions: {
			show: {
				resource: ['presence'],
				operation: ['upsert'],
			},
		},
	},
	userLocator(
		{ resource: ['presence'], operation: ['upsert', 'update'] },
		{
			description:
				'The user the presence belongs to. Appwrite requires it when the request is made with an API key.',
		},
	),
	{
		displayName: 'Status',
		name: 'presenceStatus',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. online',
		description: 'The presence status to set, for example online, away, or busy',
		displayOptions: {
			show: {
				resource: ['presence'],
				operation: ['upsert'],
			},
		},
	},
	permissionsProperty(
		'presence',
		['upsert', 'update'],
		'Permission strings, one per line (or a JSON array), e.g. read("any"). Leave empty to apply Appwrite\'s defaults on create, or to keep the existing permissions on update. Enter [] to clear all permissions.',
	),
	{
		displayName: 'Options',
		name: 'presenceOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['presence'],
				operation: ['upsert', 'update'],
			},
		},
		options: [
			{
				displayName: 'Expires At',
				name: 'expiresAt',
				type: 'dateTime',
				default: '',
				description: 'When the presence entry expires and stops counting as present',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description:
					'A JSON object of extra data to store with the presence, e.g. the page the user is on',
			},
			{
				displayName: 'Purge List Cache',
				name: 'purge',
				type: 'boolean',
				default: false,
				description:
					'Whether to purge the cached responses of Get Many so the change shows up there immediately',
				displayOptions: { show: { '/operation': ['update'] } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				placeholder: 'e.g. away',
				description: 'The new presence status',
				displayOptions: { show: { '/operation': ['update'] } },
			},
		],
	},
	...returnAllAndLimitProperties('presence', ['getMany']),
	...queriesProperties('presence', ['getMany']),
];
