import type { INodeProperties } from 'n8n-workflow';

import { appLocator, teamLocator } from './locators';
import { queriesProperties, returnAllAndLimitProperties, simplifyProperty } from './shared';

export const appOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['app'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Register a new OAuth2 app in the project',
				action: 'Create app',
			},
			{
				name: 'Create Installation Token',
				value: 'createInstallationToken',
				description:
					'Issue an access token for an installation of an app. The output contains the token.',
				action: 'Create app installation token',
			},
			{
				name: 'Create Key',
				value: 'createKey',
				description:
					"Create a key the app uses to list its installations and issue their tokens. The output contains the key's secret.",
				action: 'Create app key',
			},
			{
				name: 'Create Secret',
				value: 'createSecret',
				description:
					'Create a client secret for an app. The output contains the secret, which Appwrite returns only this once.',
				action: 'Create app secret',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an app permanently',
				action: 'Delete app',
			},
			{
				name: 'Delete Installation',
				value: 'deleteInstallation',
				description: 'Uninstall an app from a team and revoke the tokens of that installation',
				action: 'Delete app installation',
			},
			{
				name: 'Delete Key',
				value: 'deleteKey',
				description: 'Delete a key of an app permanently',
				action: 'Delete app key',
			},
			{
				name: 'Delete Secret',
				value: 'deleteSecret',
				description: 'Delete a client secret of an app permanently',
				action: 'Delete app secret',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single app by its ID',
				action: 'Get app',
			},
			{
				name: 'Get Installation',
				value: 'getInstallation',
				description: 'Get an installation of an app by ID',
				action: 'Get app installation',
			},
			{
				name: 'Get Key',
				value: 'getKey',
				description: "Get a key of an app by ID. The output contains the key's secret.",
				action: 'Get app key',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List apps, with optional filters',
				action: 'Get many apps',
			},
			{
				name: 'Get Many Installation Scopes',
				value: 'getManyInstallationScopes',
				description: 'List the scopes an app can ask for when it is installed on a team',
				action: 'Get many app installation scopes',
			},
			{
				name: 'Get Many Installations',
				value: 'getManyInstallations',
				description: 'List the installations of an app, one for each team it is installed on',
				action: 'Get many app installations',
			},
			{
				name: 'Get Many Keys',
				value: 'getManyKeys',
				description: 'List the keys of an app. The output contains their secrets.',
				action: 'Get many app keys',
			},
			{
				name: 'Get Many OAuth2 Scopes',
				value: 'getManyOAuth2Scopes',
				description: 'List the scopes an app can ask users for when they sign in with OAuth2',
				action: 'Get many app authorization scopes',
			},
			{
				name: 'Get Many Secrets',
				value: 'getManySecrets',
				description: 'List the client secrets of an app, without their values',
				action: 'Get many app secrets',
			},
			{
				name: 'Get Secret',
				value: 'getSecret',
				description: 'Get a client secret of an app by ID, without its value',
				action: 'Get app secret',
			},
			{
				name: 'Revoke All Tokens',
				value: 'revokeTokens',
				description: 'Revoke every access token issued for an app',
				action: 'Revoke all app tokens',
			},
			{
				name: 'Transfer to Team',
				value: 'transfer',
				description: 'Move an app to another team',
				action: 'Transfer app to team',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the details of an app',
				action: 'Update app',
			},
			{
				name: 'Update Labels',
				value: 'updateLabels',
				description: 'Replace the labels of an app',
				action: 'Update app labels',
			},
		],
		default: 'get',
	},
];

const LIST_HELP = 'as a comma-separated list or a JSON array';
const URI_RULES =
	'Each must be an https URL, an http loopback URL (localhost, 127.0.0.1, [::1]), or a private-use scheme URI such as com.example.app:/oauth, with no fragment';

const redirectUrisProperty: INodeProperties = {
	displayName: 'Redirect URIs',
	name: 'redirectUris',
	type: 'string',
	default: '',
	placeholder: 'e.g. https://example.com/callback',
	description: `Where users may be sent back to after they sign in, ${LIST_HELP}. ${URI_RULES}.`,
};

/** App details the create endpoint takes as options and the update endpoint as fields. */
const APP_DETAILS: INodeProperties[] = [
	{
		displayName: 'Client Type',
		name: 'appClientType',
		type: 'options',
		options: [
			{
				name: 'Confidential',
				value: 'confidential',
				description: 'A server-side client that signs in with a client secret',
			},
			{
				name: 'Public',
				value: 'public',
				description:
					'A single-page, mobile, or native app that cannot keep a secret. It must use PKCE.',
			},
		],
		default: 'confidential',
		description: 'The OAuth2 client type of the app',
	},
	{
		displayName: 'Contact Emails',
		name: 'appContacts',
		type: 'string',
		default: '',
		placeholder: 'e.g. support@example.com',
		description: `Support or security contact emails, ${LIST_HELP}. Up to 100.`,
	},
	{
		displayName: 'Data Deletion URL',
		name: 'dataDeletionUrl',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/data-deletion',
		description: 'Where users can ask for their data to be deleted, shown on the consent screen',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 2 },
		default: '',
		description: 'What the app does, shown to users on the consent screen',
	},
	{
		displayName: 'Device Flow',
		name: 'deviceFlow',
		type: 'boolean',
		default: false,
		description:
			'Whether the app may sign users in with the OAuth2 device authorization grant, for devices without a browser or keyboard such as TVs and command-line tools',
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description: 'Whether the app is enabled',
	},
	{
		displayName: 'Homepage URL',
		name: 'clientUri',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com',
		description: "The app's homepage, shown on the consent screen",
	},
	{
		displayName: 'Image URLs',
		name: 'appImages',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/screenshot.png',
		description: `Images of the app shown on the consent screen, ${LIST_HELP}. Up to 100.`,
	},
	{
		displayName: 'Logo URL',
		name: 'logoUri',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/logo.png',
		description: "The app's logo, shown on the consent screen",
	},
	{
		displayName: 'Post-Logout Redirect URIs',
		name: 'postLogoutRedirectUris',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/signed-out',
		description: `Where users may be sent after they sign out through OpenID Connect, ${LIST_HELP}. ${URI_RULES}.`,
	},
	{
		displayName: 'Privacy Policy URL',
		name: 'privacyPolicyUrl',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/privacy',
		description: "The app's privacy policy, shown on the consent screen",
	},
	{
		displayName: 'Support URL',
		name: 'supportUrl',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/support',
		description: "The app's support page, shown on the consent screen",
	},
	{
		displayName: 'Tagline',
		name: 'tagline',
		type: 'string',
		default: '',
		description: 'A short tagline shown on the consent screen',
	},
	{
		displayName: 'Tags',
		name: 'appTags',
		type: 'string',
		default: '',
		placeholder: 'e.g. productivity, automation',
		description: `Tags shown on the consent screen, ${LIST_HELP}. Up to 100, each up to 64 characters long.`,
	},
	{
		displayName: 'Terms of Service URL',
		name: 'termsUrl',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/terms',
		description: "The app's terms of service, shown on the consent screen",
	},
];

/** Details only the update endpoint takes (name and redirect URIs are on the create form's face). */
const APP_UPDATE_ONLY_DETAILS: INodeProperties[] = [
	{
		displayName: 'Installation Redirect URL',
		name: 'installationRedirectUrl',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/setup',
		description: `Where users are sent after they install the app on a team or change its installation. Leave empty for no redirect. ${URI_RULES}.`,
	},
	{
		displayName: 'Installation Scope Names or IDs',
		name: 'installationScopes',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getAppInstallationScopes' },
		default: [],
		description:
			'The scopes the app asks for when it is installed on a team. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The name of the app, shown to users on the consent screen',
	},
	redirectUrisProperty,
];

export const appFields: INodeProperties[] = [
	appLocator({
		resource: ['app'],
		operation: [
			'createInstallationToken',
			'createKey',
			'createSecret',
			'delete',
			'deleteInstallation',
			'deleteKey',
			'deleteSecret',
			'get',
			'getInstallation',
			'getKey',
			'getManyInstallations',
			'getManyKeys',
			'getManySecrets',
			'getSecret',
			'revokeTokens',
			'transfer',
			'update',
			'updateLabels',
		],
	}),
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Acme Sync',
		description: 'The name of the app, shown to users on the consent screen',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'App ID',
		name: 'appId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the app. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['create'],
			},
		},
	},
	{
		...redirectUrisProperty,
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['create'],
			},
		},
	},
	{
		...teamLocator({ resource: ['app'], operation: ['create'] }),
		required: false,
		description: 'The team that owns the app',
	},
	{
		...teamLocator({ resource: ['app'], operation: ['transfer'] }),
		description: 'The team to move the app to',
	},
	{
		displayName: 'Installation ID',
		name: 'installationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the installation, as returned by Get Many Installations',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['createInstallationToken', 'deleteInstallation', 'getInstallation'],
			},
		},
	},
	{
		displayName: 'Key ID',
		name: 'appKeyId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the app key, as returned by Get Many Keys',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['deleteKey', 'getKey'],
			},
		},
	},
	{
		displayName: 'Secret ID',
		name: 'appSecretId',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The ID of the client secret, as returned by Get Many Secrets',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['deleteSecret', 'getSecret'],
			},
		},
	},
	{
		displayName: 'Labels',
		name: 'labels',
		type: 'string',
		default: '',
		placeholder: 'e.g. featured, internal',
		description: `The labels to set, ${LIST_HELP}. Replaces all previously set labels; leave empty to remove all labels. Each label can be up to 36 alphanumeric characters long.`,
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['updateLabels'],
			},
		},
	},
	...returnAllAndLimitProperties('app', [
		'getMany',
		'getManyInstallations',
		'getManyKeys',
		'getManySecrets',
	]),
	...queriesProperties('app', ['getMany', 'getManyInstallations', 'getManyKeys', 'getManySecrets']),
	simplifyProperty('app', ['get', 'getMany']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['create'],
			},
		},
		options: APP_DETAILS,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['update'],
			},
		},
		options: [...APP_DETAILS, ...APP_UPDATE_ONLY_DETAILS].sort((a, b) =>
			a.displayName.localeCompare(b.displayName),
		),
	},
];
