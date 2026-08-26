import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties } from './shared';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new user',
				action: 'Create a user',
			},
			{
				name: 'Create JWT',
				value: 'createJWT',
				description: 'Create a JSON Web Token to authenticate on behalf of a user',
				action: 'Create a JWT for a user',
			},
			{
				name: 'Create Session',
				value: 'createSession',
				description: 'Create an immediately usable session for a user',
				action: 'Create a session for a user',
			},
			{
				name: 'Create Token',
				value: 'createToken',
				description: 'Create a token with a secret key for creating a session',
				action: 'Create a token for a user',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user and release their ID',
				action: 'Delete a user',
			},
			{
				name: 'Delete Identity',
				value: 'deleteIdentity',
				description: 'Delete an identity by its unique ID',
				action: 'Delete a user identity',
			},
			{
				name: 'Delete Session',
				value: 'deleteSession',
				description: 'Delete a single session of a user',
				action: 'Delete a user session',
			},
			{
				name: 'Delete Sessions',
				value: 'deleteSessions',
				description: "Delete all of the user's sessions",
				action: 'Delete all sessions of a user',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a user by ID',
				action: 'Get a user',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: "List the project's users, with optional filters",
				action: 'Get many users',
			},
			{
				name: 'Get Many Identities',
				value: 'getManyIdentities',
				description: 'List the identities of all users in the project',
				action: 'Get many user identities',
			},
			{
				name: 'Get Many Logs',
				value: 'getManyLogs',
				description: 'List the activity logs of a user',
				action: 'Get many user logs',
			},
			{
				name: 'Get Many Memberships',
				value: 'getManyMemberships',
				description: 'List the team memberships of a user',
				action: 'Get many user memberships',
			},
			{
				name: 'Get Many Sessions',
				value: 'getManySessions',
				description: 'List the sessions of a user',
				action: 'Get many user sessions',
			},
			{
				name: 'Get Preferences',
				value: 'getPrefs',
				description: 'Get the preferences of a user',
				action: 'Get the preferences of a user',
			},
			{
				name: 'Update Email',
				value: 'updateEmail',
				description: 'Update the email address of a user',
				action: 'Update the email of a user',
			},
			{
				name: 'Update Email Verification',
				value: 'updateEmailVerification',
				description: 'Update the email verification status of a user',
				action: 'Update the email verification of a user',
			},
			{
				name: 'Update Labels',
				value: 'updateLabels',
				description: 'Replace the labels of a user',
				action: 'Update the labels of a user',
			},
			{
				name: 'Update Name',
				value: 'updateName',
				description: 'Update the name of a user',
				action: 'Update the name of a user',
			},
			{
				name: 'Update Password',
				value: 'updatePassword',
				description: 'Update the password of a user',
				action: 'Update the password of a user',
			},
			{
				name: 'Update Phone',
				value: 'updatePhone',
				description: 'Update the phone number of a user',
				action: 'Update the phone number of a user',
			},
			{
				name: 'Update Phone Verification',
				value: 'updatePhoneVerification',
				description: 'Update the phone verification status of a user',
				action: 'Update the phone verification of a user',
			},
			{
				name: 'Update Preferences',
				value: 'updatePrefs',
				description: 'Replace the preferences of a user',
				action: 'Update the preferences of a user',
			},
			{
				name: 'Update Status',
				value: 'updateStatus',
				description: 'Activate (unblock) or block a user',
				action: 'Update the status of a user',
			},
		],
		default: 'get',
	},
];

export const userFields: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the user',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: [
					'createJWT',
					'createSession',
					'createToken',
					'delete',
					'deleteSession',
					'deleteSessions',
					'get',
					'getManyLogs',
					'getManyMemberships',
					'getManySessions',
					'getPrefs',
					'updateEmail',
					'updateEmailVerification',
					'updateLabels',
					'updateName',
					'updatePassword',
					'updatePhone',
					'updatePhoneVerification',
					'updatePrefs',
					'updateStatus',
				],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the user. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		placeholder: 'name@email.com',
		description: 'The email address of the user',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Phone Number',
		name: 'phone',
		type: 'string',
		default: '',
		placeholder: '+16175551212',
		description:
			'The phone number of the user. Format it with a leading "+" and the country code, e.g. +16175551212.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		description:
			'Plain text password of at least 8 characters. Leave empty to create the user without a password.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The name of the user',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '',
		description:
			'The ID of the session to base the JWT on. Leave empty (or use "recent") to use the most recent session.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createJWT'],
			},
		},
	},
	{
		displayName: 'Duration (Seconds)',
		name: 'duration',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 3600 },
		default: 900,
		description:
			'Time in seconds before the JWT expires. The default is 900 seconds and the maximum is 3600 seconds.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createJWT'],
			},
		},
	},
	{
		displayName: 'Token Length',
		name: 'length',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 6,
		description: 'Token length in characters',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createToken'],
			},
		},
	},
	{
		displayName: 'Expire (Seconds)',
		name: 'expireSeconds',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 900,
		description: 'Token expiration period in seconds',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createToken'],
			},
		},
	},
	{
		displayName: 'Identity ID',
		name: 'identityId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the identity to delete',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['deleteIdentity'],
			},
		},
	},
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the session to delete',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['deleteSession'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'name@email.com',
		description: 'The new email address of the user',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateEmail'],
			},
		},
	},
	{
		displayName: 'Email Verified',
		name: 'emailVerification',
		type: 'boolean',
		default: false,
		description: 'Whether the email address of the user is marked as verified',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateEmailVerification'],
			},
		},
	},
	{
		displayName: 'Labels',
		name: 'labels',
		type: 'string',
		default: '',
		placeholder: 'admin, premium',
		description:
			'The labels to set, as a comma-separated list or a JSON array. Replaces all previously set labels; leave empty to remove all labels. Each label can be up to 36 alphanumeric characters long.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateLabels'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The new name of the user',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateName'],
			},
		},
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The new plain text password of at least 8 characters',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updatePassword'],
			},
		},
	},
	{
		displayName: 'Phone Number',
		name: 'phone',
		type: 'string',
		required: true,
		default: '',
		placeholder: '+16175551212',
		description:
			'The new phone number of the user. Format it with a leading "+" and the country code, e.g. +16175551212.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updatePhone'],
			},
		},
	},
	{
		displayName: 'Phone Verified',
		name: 'phoneVerification',
		type: 'boolean',
		default: false,
		description: 'Whether the phone number of the user is marked as verified',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updatePhoneVerification'],
			},
		},
	},
	{
		displayName: 'Preferences (JSON)',
		name: 'prefs',
		type: 'json',
		default: '{}',
		description:
			'The preferences as a JSON key-value object. The object is stored as-is and replaces ALL existing preferences of the user.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updatePrefs'],
			},
		},
	},
	{
		displayName: 'Active',
		name: 'status',
		type: 'boolean',
		default: true,
		description:
			'Whether the user account is active. Enable to activate (unblock) the user, disable to block them while keeping their ID reserved.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateStatus'],
			},
		},
	},
	{
		displayName: 'Search',
		name: 'search',
		type: 'string',
		default: '',
		description: 'Search term to filter the results',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getMany', 'getManyIdentities', 'getManyMemberships'],
			},
		},
	},
	...returnAllAndLimitProperties('user', [
		'getMany',
		'getManyIdentities',
		'getManyLogs',
		'getManyMemberships',
	]),
	...queriesProperties(
		'user',
		['getMany', 'getManyIdentities', 'getManyLogs', 'getManyMemberships'],
		{
			hint: 'Filter, sort, and paginate the results. For Get Many Logs, only Limit and Offset queries are supported.',
		},
	),
];
