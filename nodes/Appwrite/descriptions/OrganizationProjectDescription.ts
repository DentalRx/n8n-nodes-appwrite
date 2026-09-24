import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

import { resourceLocator } from './locators';
import {
	listOptionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	simplifyProperty,
} from './shared';

/**
 * The projects of the organization the Appwrite Organization API credential
 * belongs to, and their API keys. Unlike the Project and API Key resources,
 * which manage the project the Appwrite API credential belongs to, these reach
 * every project in the organization.
 */

export const organizationProjectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['organizationProject'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new project in the organization',
				action: 'Create organization project',
			},
			{
				name: 'Create Ephemeral API Key',
				value: 'createEphemeralKey',
				description:
					"Create a temporary API key for a project that works for up to an hour. The output includes the key's secret, to use in later requests.",
				action: 'Create ephemeral project API key',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a project and all its data permanently',
				action: 'Delete organization project',
			},
			{
				name: 'Delete API Key',
				value: 'deleteKey',
				description: "Delete a project's API key permanently, so requests made with it are refused",
				action: 'Delete project API key',
			},
			{
				name: 'Get',
				value: 'get',
				description: "Retrieve a project's settings",
				action: 'Get organization project',
			},
			{
				name: 'Get API Key',
				value: 'getKey',
				description: "Retrieve a project's API key, including its secret and scopes",
				action: 'Get project API key',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: "Retrieve a list of the organization's projects",
				action: 'Get many organization projects',
			},
			{
				name: 'Get Many API Keys',
				value: 'getManyKeys',
				description: "Retrieve a list of a project's API keys, including their secrets",
				action: 'Get many project API keys',
			},
			{
				name: 'Update API Key',
				value: 'updateKey',
				description: "Rename a project's API key or change its scopes or expiration date",
				action: 'Update project API key',
			},
			{
				name: 'Update Name',
				value: 'updateName',
				description: 'Rename a project',
				action: 'Update organization project name',
			},
		],
		default: 'get',
	},
];

const show = (...operations: string[]) => ({
	resource: ['organizationProject'],
	operation: operations,
});

/**
 * A project of the organization. It offers no By URL mode: a Console project
 * URL carries the project's region in the same path segment as its ID
 * (`project-fra-<id>`), which the shared By URL pattern, a fixed prefix before
 * the ID, cannot express.
 */
const projectLocator = (displayed: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'organizationProjectId',
			displayName: 'Project',
			kind: 'project',
			searchListMethod: 'searchOrganizationProjects',
			placeholder: 'e.g. my-project',
			description: 'The project to use',
		},
		displayed,
	);

const projectKeyLocator = (displayed: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'organizationProjectKeyId',
			displayName: 'API Key',
			kind: 'key',
			urlSegment: 'api-keys',
			searchListMethod: 'searchOrganizationProjectKeys',
			placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
			urlPlaceholder:
				'e.g. https://cloud.appwrite.io/console/project-fra-my-project/overview/api-keys/6650f1a2003e4b5c6d7e',
			dependsOn: ['organizationProjectId.value'],
			description: 'The API key to use',
		},
		displayed,
	);

export const organizationProjectFields: INodeProperties[] = [
	projectLocator(
		show(
			'createEphemeralKey',
			'delete',
			'deleteKey',
			'get',
			'getKey',
			'getManyKeys',
			'updateKey',
			'updateName',
		),
	),
	{
		displayName: 'Project ID',
		name: 'organizationProjectId',
		type: 'string',
		default: '',
		description:
			'The ID for the project. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, 0-9, and hyphen; must not start with a hyphen. Max length: 36 characters.',
		displayOptions: { show: show('create') },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the project. Max length: 128 characters.',
		displayOptions: { show: show('create', 'updateName') },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show('create') },
		options: [
			{
				displayName: 'Region',
				name: 'projectRegion',
				type: 'options',
				options: [
					{ name: 'Frankfurt', value: 'fra' },
					{ name: 'New York', value: 'nyc' },
					{ name: 'San Francisco', value: 'sfo' },
					{ name: 'Singapore', value: 'sgp' },
					{ name: 'Sydney', value: 'syd' },
					{ name: 'Toronto', value: 'tor' },
				],
				default: 'fra',
				description:
					"Where Appwrite Cloud hosts the project's data. Leave this out on a self-hosted instance, which has a single region.",
			},
		],
	},
	{
		displayName:
			'This deletes the project with all its databases, files, users, functions, and sites. It cannot be undone.',
		name: 'organizationProjectDeleteNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: show('delete') },
	},
	simplifyProperty('organizationProject', ['get', 'getMany']),

	// API keys
	projectKeyLocator(show('deleteKey', 'getKey', 'updateKey')),
	{
		displayName: 'Scopes',
		name: 'keyScopes',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. users.read, files.write',
		description:
			'The permissions the key grants, as a comma-separated list or a JSON array of scopes such as users.read or files.write. Up to 200.',
		displayOptions: { show: show('createEphemeralKey') },
	},
	{
		displayName: 'Lifetime (Seconds)',
		name: 'keyDuration',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 3600 },
		required: true,
		default: 600,
		description: 'How long the key works, in seconds, up to one hour (3600)',
		displayOptions: { show: show('createEphemeralKey') },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description: 'The settings to change. Settings you do not add keep their current values.',
		displayOptions: { show: show('updateKey') },
		options: [
			{
				displayName: 'Expiration Date',
				name: 'expire',
				type: 'dateTime',
				default: '',
				description: 'When the key stops working. Leave empty for a key that never expires.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the key. Max length: 128 characters.',
			},
			{
				displayName: 'Scopes',
				name: 'keyScopes',
				type: 'string',
				default: '',
				placeholder: 'e.g. users.read, files.write',
				description:
					'The permissions the key grants, as a comma-separated list or a JSON array of scopes such as users.read or files.write. Replaces all current scopes.',
			},
		],
	},

	...returnAllAndLimitProperties('organizationProject', ['getMany', 'getManyKeys']),
	...queriesProperties('organizationProject', ['getMany'], {
		hint: 'You can filter on name, labels, and accessedAt',
	}),
	...queriesProperties('organizationProject', ['getManyKeys'], {
		hint: 'You can filter on name, scopes, expire, and accessedAt',
	}),
	listOptionsProperty('organizationProject', ['getMany']),
];
