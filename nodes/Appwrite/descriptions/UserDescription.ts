import type { INodeProperties } from 'n8n-workflow';

import { userLocator } from './locators';
import {
	listOptionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	simplifyProperty,
} from './shared';

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
				action: 'Create user',
			},
			{
				name: 'Create JWT',
				value: 'createJWT',
				description: 'Create a JSON Web Token to authenticate on behalf of a user',
				action: 'Create JWT for user',
			},
			{
				name: 'Create MFA Recovery Codes',
				value: 'createMfaRecoveryCodes',
				description: 'Generate the first set of MFA recovery codes for a user',
				action: 'Create user MFA recovery codes',
			},
			{
				name: 'Create Session',
				value: 'createSession',
				description: 'Create an immediately usable session for a user',
				action: 'Create session for user',
			},
			{
				name: 'Create Target',
				value: 'createTarget',
				description: 'Add an email, SMS, or push messaging target to a user',
				action: 'Create user target',
			},
			{
				name: 'Create Token',
				value: 'createToken',
				description: 'Create a token with a secret key for creating a session',
				action: 'Create token for user',
			},
			{
				name: 'Create with Password Hash',
				value: 'createWithPasswordHash',
				description:
					'Create a user whose password was hashed by another system, e.g. when migrating users to Appwrite',
				action: 'Create user with password hash',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user and release their ID',
				action: 'Delete user',
			},
			{
				name: 'Delete Identity',
				value: 'deleteIdentity',
				description: 'Delete an identity by its unique ID',
				action: 'Delete user identity',
			},
			{
				name: 'Delete MFA Authenticator',
				value: 'deleteMfaAuthenticator',
				description: "Remove the authenticator app (TOTP) from a user's MFA factors",
				action: 'Delete user MFA authenticator',
			},
			{
				name: 'Delete Session',
				value: 'deleteSession',
				description: 'Delete a single session of a user',
				action: 'Delete user session',
			},
			{
				name: 'Delete Sessions',
				value: 'deleteSessions',
				description: "Delete all of the user's sessions",
				action: 'Delete all user sessions',
			},
			{
				name: 'Delete Target',
				value: 'deleteTarget',
				description: 'Delete a messaging target of a user',
				action: 'Delete user target',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single user by its ID',
				action: 'Get user',
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
				name: 'Get Many Targets',
				value: 'getManyTargets',
				description: 'List the messaging targets of a user, with optional filters',
				action: 'Get many user targets',
			},
			{
				name: 'Get MFA Challenge',
				value: 'getMfaChallenge',
				description:
					'Get a custom MFA challenge of a user, including the code to deliver through your own channel',
				action: 'Get user MFA challenge',
			},
			{
				name: 'Get MFA Factors',
				value: 'getMfaFactors',
				description: 'Get which MFA factors a user can verify with',
				action: 'Get user MFA factors',
			},
			{
				name: 'Get MFA Recovery Codes',
				value: 'getMfaRecoveryCodes',
				description: 'Get the MFA recovery codes of a user',
				action: 'Get user MFA recovery codes',
			},
			{
				name: 'Get Preferences',
				value: 'getPrefs',
				description: 'Get the preferences of a user',
				action: 'Get user preferences',
			},
			{
				name: 'Get Target',
				value: 'getTarget',
				description: 'Get a messaging target of a user by its ID',
				action: 'Get user target',
			},
			{
				name: 'Regenerate MFA Recovery Codes',
				value: 'regenerateMfaRecoveryCodes',
				description: 'Replace the MFA recovery codes of a user with a new set',
				action: 'Regenerate user MFA recovery codes',
			},
			{
				name: 'Update Email',
				value: 'updateEmail',
				description: 'Update the email address of a user',
				action: 'Update user email',
			},
			{
				name: 'Update Email Verification',
				value: 'updateEmailVerification',
				description: 'Update the email verification status of a user',
				action: 'Update user email verification',
			},
			{
				name: 'Update Impersonator',
				value: 'updateImpersonator',
				description: 'Allow or stop a user from impersonating other users',
				action: 'Update user impersonator',
			},
			{
				name: 'Update Labels',
				value: 'updateLabels',
				description: 'Replace the labels of a user',
				action: 'Update user labels',
			},
			{
				name: 'Update MFA',
				value: 'updateMfa',
				description: 'Turn multi-factor authentication on or off for a user',
				action: 'Update user MFA',
			},
			{
				name: 'Update Name',
				value: 'updateName',
				description: 'Update the name of a user',
				action: 'Update user name',
			},
			{
				name: 'Update Password',
				value: 'updatePassword',
				description: 'Update the password of a user',
				action: 'Update user password',
			},
			{
				name: 'Update Phone',
				value: 'updatePhone',
				description: 'Update the phone number of a user',
				action: 'Update user phone number',
			},
			{
				name: 'Update Phone Verification',
				value: 'updatePhoneVerification',
				description: 'Update the phone verification status of a user',
				action: 'Update user phone verification',
			},
			{
				name: 'Update Preferences',
				value: 'updatePrefs',
				description: 'Replace the preferences of a user',
				action: 'Update user preferences',
			},
			{
				name: 'Update Status',
				value: 'updateStatus',
				description: 'Activate (unblock) or block a user',
				action: 'Update user status',
			},
			{
				name: 'Update Target',
				value: 'updateTarget',
				description: 'Update the identifier, name, or provider of a messaging target',
				action: 'Update user target',
			},
		],
		default: 'get',
	},
];

/** Shows a field for Create with Password Hash when one of the given algorithms is selected. */
const forHashAlgorithms = (algorithms: string[]) => ({
	show: {
		resource: ['user'],
		operation: ['createWithPasswordHash'],
		passwordHashAlgorithm: algorithms,
	},
});

export const userFields: INodeProperties[] = [
	userLocator({
		resource: ['user'],
		operation: [
			'createJWT',
			'createMfaRecoveryCodes',
			'createSession',
			'createTarget',
			'createToken',
			'delete',
			'deleteMfaAuthenticator',
			'deleteSession',
			'deleteSessions',
			'deleteTarget',
			'get',
			'getManyMemberships',
			'getManySessions',
			'getManyTargets',
			'getMfaChallenge',
			'getMfaFactors',
			'getMfaRecoveryCodes',
			'getPrefs',
			'getTarget',
			'regenerateMfaRecoveryCodes',
			'updateEmail',
			'updateEmailVerification',
			'updateImpersonator',
			'updateLabels',
			'updateMfa',
			'updateName',
			'updatePassword',
			'updatePhone',
			'updatePhoneVerification',
			'updatePrefs',
			'updateStatus',
			'updateTarget',
		],
	}),
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		description:
			'The ID for the user. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'createWithPasswordHash'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. name@email.com',
		description: 'The email address of the user',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createWithPasswordHash'],
			},
		},
	},
	{
		displayName: 'Hash Algorithm',
		name: 'passwordHashAlgorithm',
		type: 'options',
		options: [
			{ name: 'Argon2', value: 'argon2' },
			{ name: 'Bcrypt', value: 'bcrypt' },
			{ name: 'MD5', value: 'md5' },
			{ name: 'PHPass', value: 'phpass' },
			{ name: 'Scrypt', value: 'scrypt' },
			{
				name: 'Scrypt Modified',
				value: 'scryptModified',
				description: 'The Scrypt variant Firebase Authentication uses',
			},
			{ name: 'SHA', value: 'sha' },
		],
		default: 'bcrypt',
		description: 'The algorithm the other system hashed the password with',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createWithPasswordHash'],
			},
		},
	},
	{
		displayName: 'Password Hash',
		name: 'passwordHash',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			'The password hash exactly as the other system stored it. The user signs in with their existing password, which Appwrite checks against this hash.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createWithPasswordHash'],
			},
		},
	},
	{
		displayName: 'Salt',
		name: 'passwordSalt',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The salt the password was hashed with',
		displayOptions: forHashAlgorithms(['scrypt']),
	},
	{
		displayName: 'CPU Cost',
		name: 'passwordCpu',
		type: 'number',
		typeOptions: { minValue: 2 },
		default: 8,
		description:
			'The Scrypt CPU/memory cost parameter (N) the password was hashed with. Must be a power of 2.',
		displayOptions: forHashAlgorithms(['scrypt']),
	},
	{
		displayName: 'Memory Cost',
		name: 'passwordMemory',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 14,
		description: 'The Scrypt block size parameter (r) the password was hashed with',
		displayOptions: forHashAlgorithms(['scrypt']),
	},
	{
		displayName: 'Parallel Cost',
		name: 'passwordParallel',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 1,
		description: 'The Scrypt parallelization parameter (p) the password was hashed with',
		displayOptions: forHashAlgorithms(['scrypt']),
	},
	{
		displayName: 'Hash Length',
		name: 'passwordLength',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 64,
		description: 'The length of the derived key in bytes',
		displayOptions: forHashAlgorithms(['scrypt']),
	},
	{
		displayName: 'Salt',
		name: 'passwordSalt',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: "The user's base64-encoded salt, as Firebase exports it with the user",
		displayOptions: forHashAlgorithms(['scryptModified']),
	},
	{
		displayName: 'Salt Separator',
		name: 'passwordSaltSeparator',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			"The base64-encoded salt separator from the project's password hash parameters in Firebase",
		displayOptions: forHashAlgorithms(['scryptModified']),
	},
	{
		displayName: 'Signer Key',
		name: 'passwordSignerKey',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			"The base64-encoded signer key from the project's password hash parameters in Firebase",
		displayOptions: forHashAlgorithms(['scryptModified']),
	},
	{
		displayName: 'SHA Version',
		name: 'passwordVersion',
		type: 'options',
		// Appwrite's API also lists sha512/224 and sha512/256, but its hashing
		// library rejects both, so offering them would only produce server errors.
		options: [
			{ name: 'SHA-1', value: 'sha1' },
			{ name: 'SHA-224', value: 'sha224' },
			{ name: 'SHA-256', value: 'sha256' },
			{ name: 'SHA-384', value: 'sha384' },
			{ name: 'SHA-512', value: 'sha512' },
			{ name: 'SHA3-224', value: 'sha3-224' },
			{ name: 'SHA3-256', value: 'sha3-256' },
			{ name: 'SHA3-384', value: 'sha3-384' },
			{ name: 'SHA3-512', value: 'sha3-512' },
		],
		default: 'sha256',
		description: 'The SHA variant the password was hashed with',
		displayOptions: forHashAlgorithms(['sha']),
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
		placeholder: 'e.g. name@email.com',
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
		default: true,
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
		placeholder: 'e.g. admin, premium',
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
		placeholder: 'e.g. +16175551212',
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
		default: true,
		description: 'Whether the phone number of the user is marked as verified',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updatePhoneVerification'],
			},
		},
	},
	{
		displayName: 'Preferences',
		name: 'prefs',
		type: 'json',
		default: '{}',
		description:
			'The preferences as a JSON key-value object. The object is stored as-is and replaces all existing preferences of the user.',
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
		displayName: 'Can Impersonate Users',
		name: 'impersonator',
		type: 'boolean',
		default: false,
		description:
			"Whether the user can impersonate other users of the project. An impersonator's requests can run as another user, while Appwrite's audit logs still record the impersonator.",
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateImpersonator'],
			},
		},
	},
	{
		displayName: 'MFA Enabled',
		name: 'mfa',
		type: 'boolean',
		default: true,
		description: 'Whether the user must complete multi-factor authentication to sign in',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateMfa'],
			},
		},
	},
	{
		displayName: 'Challenge ID',
		name: 'mfaChallengeId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The ID of a custom MFA challenge the user started while signing in. Only unexpired challenges of the custom factor can be read.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getMfaChallenge'],
			},
		},
	},
	{
		displayName: 'Target ID',
		name: 'targetId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the target, as returned by Get Many Targets',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['deleteTarget', 'getTarget', 'updateTarget'],
			},
		},
	},
	{
		displayName: 'Target ID',
		name: 'targetId',
		type: 'string',
		default: '',
		description:
			'The ID for the target. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createTarget'],
			},
		},
	},
	{
		displayName: 'Provider Type',
		name: 'targetProviderType',
		type: 'options',
		options: [
			{ name: 'Email', value: 'email' },
			{ name: 'Push', value: 'push' },
			{ name: 'SMS', value: 'sms' },
		],
		default: 'email',
		description: 'The kind of messages the target receives',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createTarget'],
			},
		},
	},
	{
		displayName: 'Identifier',
		name: 'targetIdentifier',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. name@email.com',
		description:
			'Where messages are delivered: an email address, a phone number with a leading "+" and the country code, or a push device token',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createTarget'],
			},
		},
	},
	...returnAllAndLimitProperties('user', [
		'getMany',
		'getManyIdentities',
		'getManyMemberships',
		'getManyTargets',
	]),
	...queriesProperties('user', [
		'getMany',
		'getManyIdentities',
		'getManyMemberships',
		'getManyTargets',
	]),
	simplifyProperty('user', ['get', 'getMany']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'e.g. name@email.com',
				description: 'The email address of the user',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the user',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Plain text password of at least 8 characters. Leave empty to create the user without a password.',
			},
			{
				displayName: 'Phone Number',
				name: 'phone',
				type: 'string',
				default: '',
				placeholder: 'e.g. +16175551212',
				description:
					'The phone number of the user. Format it with a leading "+" and the country code, e.g. +16175551212.',
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
				resource: ['user'],
				operation: ['createJWT'],
			},
		},
		options: [
			{
				displayName: 'Duration (Seconds)',
				name: 'duration',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 3600 },
				default: 900,
				description:
					'Time in seconds before the JWT expires. Defaults to 900 seconds (15 minutes); the maximum is 3600 seconds.',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '',
				description:
					'The ID of the session to base the JWT on. Leave empty (or use "recent") to use the most recent session.',
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
				resource: ['user'],
				operation: ['createToken'],
			},
		},
		options: [
			{
				displayName: 'Expiration (Seconds)',
				name: 'expire',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 900,
				description:
					'Time in seconds before the token expires. Defaults to 900 seconds (15 minutes).',
			},
			{
				displayName: 'Token Length',
				name: 'length',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 6,
				description: 'Token length in characters. Defaults to 6.',
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
				resource: ['user'],
				operation: ['createWithPasswordHash'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the user, up to 128 characters',
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
				resource: ['user'],
				operation: ['createTarget'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. Work Phone',
				description: 'A name for the target, up to 128 characters',
			},
			{
				displayName: 'Provider ID',
				name: 'providerId',
				type: 'string',
				default: '',
				description:
					'The ID of the messaging provider to send through. Leave empty to use the first provider of the matching type.',
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
				resource: ['user'],
				operation: ['updateTarget'],
			},
		},
		options: [
			{
				displayName: 'Identifier',
				name: 'targetIdentifier',
				type: 'string',
				default: '',
				description:
					'The new email address, phone number, or push device token, matching the type of the target. Updating it also clears the expired flag.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new name of the target, up to 128 characters',
			},
			{
				displayName: 'Provider ID',
				name: 'providerId',
				type: 'string',
				default: '',
				description:
					'The ID of the messaging provider to send through. It must be of the same type as the target.',
			},
		],
	},
	listOptionsProperty('user', ['getMany', 'getManyIdentities', 'getManyMemberships']),
];
