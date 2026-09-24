import type { INodeProperties } from 'n8n-workflow';

import { userLocator } from './locators';
import { queriesProperties, returnAllAndLimitProperties, simplifyProperty } from './shared';

/**
 * The operations that act on the signed-in user. Appwrite serves them only to
 * that user's JWT or session secret: their route scope is `account`, which no
 * API key can hold.
 */
const USER_OPERATIONS = [
	'createEmailVerification',
	'createMfaAuthenticator',
	'createMfaChallenge',
	'createMfaRecoveryCodes',
	'createPhoneVerification',
	'deleteConsent',
	'deleteConsentToken',
	'deleteIdentity',
	'deleteMfaAuthenticator',
	'deleteSession',
	'deleteSessions',
	'get',
	'getConsent',
	'getConsentToken',
	'getManyConsents',
	'getManyConsentTokens',
	'getManyIdentities',
	'getManySessions',
	'getMfaFactors',
	'getMfaRecoveryCodes',
	'getPrefs',
	'getSession',
	'regenerateMfaRecoveryCodes',
	'updateEmail',
	'updateName',
	'updatePassword',
	'updatePhone',
	'updatePrefs',
	'updateSession',
	'updateStatus',
];

/**
 * The operations that record an MFA factor on the current session. Appwrite
 * finds that session from a session secret only (a JWT names no current
 * session), so these act on the user through a session secret.
 */
const SESSION_OPERATIONS = ['completeMfaChallenge', 'updateMfa', 'verifyMfaAuthenticator'];

/**
 * Every operation that offers a choice of JWT or session secret, including the
 * ID token sign-in, which links the identity to a signed-in user instead of
 * using the API key.
 */
const USER_AUTHENTICATION_OPERATIONS = [...USER_OPERATIONS, 'createIdTokenSession'];

/** The anti-phishing phrase option of the operations that email a secret. */
const SECURITY_PHRASE_OPTION: INodeProperties = {
	displayName: 'Security Phrase',
	name: 'phrase',
	type: 'boolean',
	default: false,
	description:
		'Whether to put a random phrase in both the email and the response. Showing the phrase in your app lets the user check the email came from their request.',
};

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Complete Email Verification',
				value: 'completeEmailVerification',
				description:
					'Confirm an email address with the user ID and secret from the verification email',
				action: 'Complete account email verification',
			},
			{
				name: 'Complete MFA Challenge',
				value: 'completeMfaChallenge',
				description: 'Finish an MFA challenge with its one-time code, verifying the session',
				action: 'Complete account MFA challenge',
			},
			{
				name: 'Complete Password Recovery',
				value: 'completeRecovery',
				description: 'Set a new password with the user ID and secret from the recovery email',
				action: 'Complete account password recovery',
			},
			{
				name: 'Complete Phone Verification',
				value: 'completePhoneVerification',
				description: 'Confirm a phone number with the user ID and secret from the verification SMS',
				action: 'Complete account phone verification',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Register a new account with an email address and password',
				action: 'Create account',
			},
			{
				name: 'Create Anonymous Session',
				value: 'createAnonymousSession',
				description: 'Sign in a new anonymous user and return the session secret',
				action: 'Create anonymous account session',
			},
			{
				name: 'Create Email Password Session',
				value: 'createEmailPasswordSession',
				description:
					'Sign a user in with their email address and password and return the session secret',
				action: 'Create account email password session',
			},
			{
				name: 'Create Email Token',
				value: 'createEmailToken',
				description: 'Email a user a 6-digit sign-in code, registering them if the address is new',
				action: 'Create account email token',
			},
			{
				name: 'Create Email Verification',
				value: 'createEmailVerification',
				description: 'Send the signed-in user a link or code to verify their email address',
				action: 'Create account email verification',
			},
			{
				name: 'Create ID Token Session',
				value: 'createIdTokenSession',
				description: 'Sign a user in with an ID token from Sign in with Apple or Google',
				action: 'Create account ID token session',
			},
			{
				name: 'Create Magic URL Token',
				value: 'createMagicUrlToken',
				description: 'Email a user a sign-in link, registering them if the address is new',
				action: 'Create account magic URL token',
			},
			{
				name: 'Create MFA Authenticator',
				value: 'createMfaAuthenticator',
				description: 'Add an authenticator app, returning its secret and QR code URI',
				action: 'Create account MFA authenticator',
			},
			{
				name: 'Create MFA Challenge',
				value: 'createMfaChallenge',
				description: 'Start an MFA challenge, sending a one-time code for email and phone factors',
				action: 'Create account MFA challenge',
			},
			{
				name: 'Create MFA Recovery Codes',
				value: 'createMfaRecoveryCodes',
				description: 'Generate one-time backup codes for signing in with MFA',
				action: 'Create account MFA recovery codes',
			},
			{
				name: 'Create Password Recovery',
				value: 'createRecovery',
				description: 'Email a user a link or code to reset their password',
				action: 'Create account password recovery',
			},
			{
				name: 'Create Phone Token',
				value: 'createPhoneToken',
				description: 'Text a user a sign-in code, registering them if the number is new',
				action: 'Create account phone token',
			},
			{
				name: 'Create Phone Verification',
				value: 'createPhoneVerification',
				description: 'Text the signed-in user a code to verify their phone number',
				action: 'Create account phone verification',
			},
			{
				name: 'Create Session',
				value: 'createSession',
				description: 'Exchange the user ID and secret of a sign-in token for a session',
				action: 'Create account session',
			},
			{
				name: 'Delete Consent',
				value: 'deleteConsent',
				description: "Revoke an app's OAuth2 consent and every token issued under it",
				action: 'Delete account consent',
			},
			{
				name: 'Delete Consent Token',
				value: 'deleteConsentToken',
				description: "Revoke one device's tokens issued under an OAuth2 consent",
				action: 'Delete account consent token',
			},
			{
				name: 'Delete Identity',
				value: 'deleteIdentity',
				description: 'Unlink an OAuth2 identity from the signed-in user',
				action: 'Delete account identity',
			},
			{
				name: 'Delete MFA Authenticator',
				value: 'deleteMfaAuthenticator',
				description: 'Remove the authenticator app of the signed-in user',
				action: 'Delete account MFA authenticator',
			},
			{
				name: 'Delete Session',
				value: 'deleteSession',
				description: 'Sign the user out of one session',
				action: 'Delete account session',
			},
			{
				name: 'Delete Sessions',
				value: 'deleteSessions',
				description: 'Sign the user out on all devices',
				action: 'Delete all account sessions',
			},
			{
				name: 'Get',
				value: 'get',
				description: "Retrieve the signed-in user's account",
				action: 'Get account',
			},
			{
				name: 'Get Consent',
				value: 'getConsent',
				description: 'Retrieve an OAuth2 consent the user gave to an app',
				action: 'Get account consent',
			},
			{
				name: 'Get Consent Token',
				value: 'getConsentToken',
				description: "Retrieve one device's tokens issued under an OAuth2 consent",
				action: 'Get account consent token',
			},
			{
				name: 'Get Many Consent Tokens',
				value: 'getManyConsentTokens',
				description: 'List the devices holding tokens issued under an OAuth2 consent',
				action: 'Get many account consent tokens',
			},
			{
				name: 'Get Many Consents',
				value: 'getManyConsents',
				description: 'List the OAuth2 consents the user gave to apps',
				action: 'Get many account consents',
			},
			{
				name: 'Get Many Identities',
				value: 'getManyIdentities',
				description: 'List the OAuth2 identities linked to the signed-in user',
				action: 'Get many account identities',
			},
			{
				name: 'Get Many Sessions',
				value: 'getManySessions',
				description: "List the signed-in user's sessions across devices",
				action: 'Get many account sessions',
			},
			{
				name: 'Get MFA Factors',
				value: 'getMfaFactors',
				description: 'Check which MFA factors the signed-in user can use',
				action: 'Get account MFA factors',
			},
			{
				name: 'Get MFA Recovery Codes',
				value: 'getMfaRecoveryCodes',
				description: "Retrieve the user's MFA recovery codes, after an MFA challenge",
				action: 'Get account MFA recovery codes',
			},
			{
				name: 'Get Preferences',
				value: 'getPrefs',
				description: "Retrieve the signed-in user's preferences",
				action: 'Get account preferences',
			},
			{
				name: 'Get Session',
				value: 'getSession',
				description: 'Retrieve a session of the signed-in user',
				action: 'Get account session',
			},
			{
				name: 'Regenerate MFA Recovery Codes',
				value: 'regenerateMfaRecoveryCodes',
				description: 'Replace the MFA recovery codes with new ones, after an MFA challenge',
				action: 'Regenerate account MFA recovery codes',
			},
			{
				name: 'Update Email',
				value: 'updateEmail',
				description: "Change the signed-in user's email address, confirmed with their password",
				action: 'Update account email',
			},
			{
				name: 'Update MFA',
				value: 'updateMfa',
				description: 'Turn multi-factor authentication on or off for the signed-in user',
				action: 'Update account MFA',
			},
			{
				name: 'Update Name',
				value: 'updateName',
				description: "Change the signed-in user's name",
				action: 'Update account name',
			},
			{
				name: 'Update Password',
				value: 'updatePassword',
				description: "Change the signed-in user's password",
				action: 'Update account password',
			},
			{
				name: 'Update Phone',
				value: 'updatePhone',
				description: "Change the signed-in user's phone number, confirmed with their password",
				action: 'Update account phone number',
			},
			{
				name: 'Update Preferences',
				value: 'updatePrefs',
				description: "Replace the signed-in user's preferences",
				action: 'Update account preferences',
			},
			{
				name: 'Update Session',
				value: 'updateSession',
				description: 'Extend a session, refreshing its OAuth2 access token if it has one',
				action: 'Update account session',
			},
			{
				name: 'Update Status',
				value: 'updateStatus',
				description: "Block the signed-in user's account, keeping the user record",
				action: 'Update account status',
			},
			{
				name: 'Verify MFA Authenticator',
				value: 'verifyMfaAuthenticator',
				description: 'Confirm a newly added authenticator app with a code from it',
				action: 'Verify account MFA authenticator',
			},
		],
		default: 'get',
	},
];

export const accountFields: INodeProperties[] = [
	{
		displayName: 'Authentication',
		name: 'accountAuthentication',
		type: 'options',
		options: [
			{
				name: 'User JWT',
				value: 'jwt',
				description: 'A JSON Web Token created for the user',
			},
			{
				name: 'User Session Secret',
				value: 'session',
				description: "The secret of one of the user's sessions",
			},
		],
		default: 'jwt',
		description:
			"How to act as the signed-in user. The credential's API key cannot act as a user, so this operation needs the user's JWT or session secret.",
		displayOptions: {
			show: {
				resource: ['account'],
				operation: USER_OPERATIONS,
			},
		},
	},
	{
		displayName: 'Authentication',
		name: 'accountAuthentication',
		type: 'options',
		options: [
			{
				name: 'API Key (Server-Side)',
				value: 'apiKey',
				description: "Sign the user in with the credential's API key and return the session secret",
			},
			{
				name: 'User JWT',
				value: 'jwt',
				description: 'Link the identity to the user a JSON Web Token was created for',
			},
			{
				name: 'User Session Secret',
				value: 'session',
				description: 'Link the identity to the user a session secret belongs to',
			},
		],
		default: 'apiKey',
		description:
			"How to call Appwrite. As a signed-in user, the ID token's identity is linked to that user's account, but only the API key gets the new session's secret back.",
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['createIdTokenSession'],
			},
		},
	},
	{
		displayName: 'JWT',
		name: 'accountJwt',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			"The JSON Web Token of the user to act as. Create one with the User resource's Create JWT operation, or with account.createJWT() in your app and pass it in, e.g. through a webhook. A JWT expires after 15 minutes unless created with a longer duration.",
		displayOptions: {
			show: {
				resource: ['account'],
				operation: USER_AUTHENTICATION_OPERATIONS,
				accountAuthentication: ['jwt'],
			},
		},
	},
	{
		displayName: 'Session Secret',
		name: 'accountSessionSecret',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			"The secret of a session of the user to act as: the 'secret' field returned when the session is created with the API key, e.g. by Create Email Password Session or by the User resource's Create Session",
		displayOptions: {
			show: {
				resource: ['account'],
				operation: USER_AUTHENTICATION_OPERATIONS,
				accountAuthentication: ['session'],
			},
		},
	},
	{
		displayName: 'Session Secret',
		name: 'accountSessionSecret',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			"The secret of the session of the user to act as: the 'secret' field returned when the session is created with the API key, e.g. by Create Email Password Session. Appwrite records the MFA factor on this session, so a JWT cannot stand in for it.",
		displayOptions: {
			show: {
				resource: ['account'],
				operation: SESSION_OPERATIONS,
			},
		},
	},
	{
		displayName: 'Method',
		name: 'accountEmailMethod',
		type: 'options',
		options: [
			{
				name: 'Code',
				value: 'code',
				description: 'A 6-digit code the user enters in your app',
			},
			{
				name: 'Link',
				value: 'link',
				description: 'A link to a page of your app, carrying the user ID and secret',
			},
		],
		default: 'link',
		description: 'Whether the user gets a link or a 6-digit code by email',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: [
					'completeEmailVerification',
					'completeRecovery',
					'createEmailVerification',
					'createRecovery',
				],
			},
		},
	},
	userLocator(
		{
			resource: ['account'],
			operation: [
				'completeEmailVerification',
				'completePhoneVerification',
				'completeRecovery',
				'createSession',
			],
		},
		{
			description:
				'The user the secret was sent to. The link or token response carries it as userId.',
		},
	),
	{
		displayName: 'Secret',
		name: 'accountSecret',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			'The secret the user received: the secret query parameter of the emailed link, or the code from the email or SMS',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: [
					'completeEmailVerification',
					'completePhoneVerification',
					'completeRecovery',
					'createSession',
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
			'The ID for the new account. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['create'],
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
			'The ID for a new account, used only when no account has this email address or phone number yet (otherwise it is ignored). Leave empty (or use unique()) to auto-generate a unique ID.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['createEmailToken', 'createMagicUrlToken', 'createPhoneToken'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. nathan@example.com',
		description: 'The email address of the user',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: [
					'create',
					'createEmailPasswordSession',
					'createEmailToken',
					'createMagicUrlToken',
					'createRecovery',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. nathan@example.com',
		description:
			'The new email address. Changing it resets the email verification status; a new verification email is not sent automatically.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['updateEmail'],
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
		description: 'The password of the user, between 8 and 256 characters',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['create', 'createEmailPasswordSession'],
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
		description: 'The current password of the user, to confirm the change',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['updateEmail', 'updatePhone'],
			},
		},
	},
	{
		displayName: 'New Password',
		name: 'password',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The new password of the user, between 8 and 256 characters',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['completeRecovery', 'updatePassword'],
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
			'The phone number of the user. Format it with a leading "+" and the country code, e.g. +16175551212.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['createPhoneToken'],
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
			'The new phone number, with a leading "+" and the country code, e.g. +16175551212. Changing it resets the phone verification status; a verification SMS is not sent automatically.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['updatePhone'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The new name of the user. Max length: 128 characters.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['updateName'],
			},
		},
	},
	{
		displayName: 'Redirect URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/verify',
		description:
			"The page of your app the emailed link opens, with the user ID and secret added to its query string. Its hostname must be one of the project's platforms.",
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['createEmailVerification', 'createRecovery'],
				accountEmailMethod: ['link'],
			},
		},
	},
	{
		displayName: 'Provider',
		name: 'accountIdTokenProvider',
		type: 'options',
		options: [
			{ name: 'Apple', value: 'apple' },
			{ name: 'Google', value: 'google' },
		],
		default: 'google',
		description:
			'The OAuth2 provider that issued the ID token. Native sign-in must be turned on for it in the project.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['createIdTokenSession'],
			},
		},
	},
	{
		displayName: 'ID Token',
		name: 'accountIdToken',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			'The OpenID Connect ID token your app got natively from the provider, e.g. from Google Credential Manager or Sign in with Apple',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['createIdTokenSession'],
			},
		},
	},
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
		description:
			'The ID of the session. With User Session Secret authentication, "current" stands for the session of that secret.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['deleteSession', 'getSession', 'updateSession'],
			},
		},
	},
	{
		displayName: 'Identity ID',
		name: 'identityId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the identity to unlink',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['deleteIdentity'],
			},
		},
	},
	{
		displayName: 'Consent ID',
		name: 'consentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the OAuth2 consent',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: [
					'deleteConsent',
					'deleteConsentToken',
					'getConsent',
					'getConsentToken',
					'getManyConsentTokens',
				],
			},
		},
	},
	{
		displayName: 'Token ID',
		name: 'consentTokenId',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The ID of the token family, one per device the app is signed in on',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['deleteConsentToken', 'getConsentToken'],
			},
		},
	},
	{
		displayName: 'Preferences',
		name: 'prefs',
		type: 'json',
		default: '{}',
		description:
			'The preferences as a JSON key-value object. The object is stored as-is and replaces all existing preferences. Max size: 64 kB.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['updatePrefs'],
			},
		},
	},
	{
		displayName: 'MFA Enabled',
		name: 'accountMfa',
		type: 'boolean',
		default: true,
		description: 'Whether signing in needs a second factor once the user has one verified',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['updateMfa'],
			},
		},
	},
	{
		displayName: 'Factor',
		name: 'accountMfaFactor',
		type: 'options',
		options: [
			{
				name: 'Authenticator App',
				value: 'totp',
				description: 'A code from the authenticator app added to the account',
			},
			{
				name: 'Custom',
				value: 'custom',
				description: 'A code your own backend delivers to the user',
			},
			{
				name: 'Email',
				value: 'email',
				description: "A code sent to the user's verified email address",
			},
			{
				name: 'Phone',
				value: 'phone',
				description: "A code sent to the user's verified phone number",
			},
			{
				name: 'Recovery Code',
				value: 'recoverycode',
				description: 'One of the MFA recovery codes of the user',
			},
		],
		default: 'totp',
		description: 'The second factor the user proves',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['createMfaChallenge'],
			},
		},
	},
	{
		displayName: 'Challenge ID',
		name: 'challengeId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the challenge, returned by Create MFA Challenge',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['completeMfaChallenge'],
			},
		},
	},
	{
		displayName: 'Code',
		name: 'accountOtp',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		placeholder: 'e.g. 123456',
		description: 'The one-time code the user entered',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['completeMfaChallenge', 'verifyMfaAuthenticator'],
			},
		},
	},
	...returnAllAndLimitProperties('account', [
		'getManyConsents',
		'getManyConsentTokens',
		'getManyIdentities',
	]),
	...queriesProperties('account', ['getManyConsents', 'getManyConsentTokens', 'getManyIdentities']),
	simplifyProperty('account', [
		'get',
		'getConsentToken',
		'getManyConsentTokens',
		'getManyIdentities',
		'getManySessions',
		'getSession',
	]),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the user. Max length: 128 characters.',
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
				resource: ['account'],
				operation: ['updatePassword'],
			},
		},
		options: [
			{
				displayName: 'Current Password',
				name: 'oldPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'The current password of the user. Required unless the user signed up through OAuth2, a team invite, or a magic URL and never set one.',
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
				resource: ['account'],
				operation: ['createEmailToken'],
			},
		},
		options: [SECURITY_PHRASE_OPTION],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['createEmailVerification', 'createRecovery'],
				accountEmailMethod: ['code'],
			},
		},
		options: [SECURITY_PHRASE_OPTION],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['createMagicUrlToken'],
			},
		},
		options: [
			{
				displayName: 'Redirect URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com/sign-in',
				description:
					"The page of your app the emailed link opens, with the user ID and secret added to its query string. Its hostname must be one of the project's platforms. Leave empty to use Appwrite's own page.",
			},
			SECURITY_PHRASE_OPTION,
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
				resource: ['account'],
				operation: ['createIdTokenSession'],
			},
		},
		options: [
			{
				displayName: 'Access Token',
				name: 'accessToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					"A provider access token to store on the session for calling the provider's APIs later. It is never used to sign in.",
			},
			{
				displayName: 'Access Token Expiry (Seconds)',
				name: 'accessTokenExpiry',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Seconds until the access token expires, as reported by the provider',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description:
					'The name for a new user when the ID token carries none, as on the first Sign in with Apple',
			},
			{
				displayName: 'Nonce',
				name: 'nonce',
				type: 'string',
				default: '',
				description:
					'The raw nonce your app used when requesting the ID token. Required for Apple, and whenever the token carries a nonce.',
			},
		],
	},
];
