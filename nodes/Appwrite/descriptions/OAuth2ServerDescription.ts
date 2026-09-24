import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

import { userAuthenticationProperty, userSecretProperties } from './AccountDescription';
import { appLocator } from './locators';
import { OIDC_PROMPT_OPTIONS } from './oauth2Providers';
import { simplifyProperty } from './shared';

/**
 * The OAuth2 server of the project: the endpoints other apps sign users in
 * through once the project is set up as their OAuth2 and OpenID Connect
 * provider (the Project resource's Update OAuth2 Server). Three parties call
 * them, and each operation acts as the one Appwrite expects:
 *
 * - the app (the OAuth2 client) asks for authorization and exchanges and
 *   revokes tokens, proving itself with its ID and, if confidential, its
 *   secret;
 * - the consent page of the project asks the signed-in user to approve or
 *   reject the request, so it acts as that user;
 * - the user's browser opens the authorization URL, which the node only
 *   builds.
 */

/** Operations that name the app (the OAuth2 client) a request is for. */
const APP_OPERATIONS = [
	'createDeviceAuthorization',
	'createPushedAuthorizationRequest',
	'createToken',
	'getAuthorizationUrl',
	'revokeToken',
	'startAuthorization',
];

/** Operations that authenticate a confidential app with its client secret. */
const SECRET_OPERATIONS = ['createToken', 'revokeToken'];

/** Operations that take a whole authorization request, or a pushed one. */
const REQUEST_OPERATIONS = ['getAuthorizationUrl', 'startAuthorization'];

/** Operations of a consent page, which act as the signed-in user. */
const USER_OPERATIONS = [
	'approveAuthorization',
	'createDeviceGrant',
	'rejectAuthorization',
	'startAuthorization',
];

/** Operations of a consent or device code page, for the flow notice. */
const CONSENT_OPERATIONS = [...USER_OPERATIONS, 'getGrant'];

const show = (
	operations: string[],
	extra: IDisplayOptions['show'] = {},
): IDisplayOptions['show'] => ({ resource: ['oauth2Server'], operation: operations, ...extra });

/**
 * The app (OAuth2 client) a request is for. Besides the apps of the project,
 * Appwrite accepts apps that describe themselves in a client metadata document
 * and are identified by its URL, so the ID mode takes any value, not only app
 * IDs.
 */
function clientLocator(): INodeProperties {
	const locator = appLocator(show(APP_OPERATIONS), {
		description:
			'The app (OAuth2 client) the request is for. Its app ID is its client ID. In ID mode, an app outside the project can also be entered by the URL of its client metadata document.',
	});
	return {
		...locator,
		modes: locator.modes?.map((mode) =>
			mode.name === 'id' ? { ...mode, validation: undefined } : mode,
		),
	};
}

const LIST_HELP = 'as a comma-separated list or a JSON array';

const AUTHORIZATION_DETAILS_HELP =
	'What the app asks to access, as a JSON array of objects that each have a type the project accepts plus fields of your own, e.g. [{"type": "calendar", "actions": ["read"]}]';

const RESOURCE_HELP = `The APIs the tokens are meant for, as absolute URLs, ${LIST_HELP}`;

const SCOPES_HELP =
	'The permissions the app asks for, space- or comma-separated, e.g. openid email profile. Built-in scopes are openid, email, profile, and phone; the others must be allowed in the OAuth2 server settings.';

/** The optional parameters of an authorization request, pushed or in the URL. */
const AUTHORIZATION_OPTIONS: INodeProperties[] = [
	{
		displayName: 'Authorization Details',
		name: 'authorizationDetails',
		type: 'json',
		default: '[]',
		description: AUTHORIZATION_DETAILS_HELP,
	},
	{
		displayName: 'Code Challenge',
		name: 'oauth2CodeChallenge',
		type: 'string',
		default: '',
		description:
			'The PKCE code challenge derived from the code verifier the app later sends to Create Token. Required for public apps.',
	},
	{
		displayName: 'Code Challenge Method',
		name: 'oauth2CodeChallengeMethod',
		type: 'options',
		options: [
			{
				name: 'Plain',
				value: 'plain',
				description: 'The challenge is the code verifier itself',
			},
			{
				name: 'S256',
				value: 'S256',
				description: 'The challenge is the base64url-encoded SHA-256 hash of the code verifier',
			},
		],
		default: 'S256',
		description:
			'How the code challenge was derived from the code verifier. Sent only with a code challenge.',
	},
	{
		displayName: 'Max Authentication Age',
		name: 'oauth2MaxAge',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 3600,
		description:
			'How recently, in seconds, the user must have signed in. Older sign-ins are asked to sign in again.',
	},
	{
		displayName: 'Nonce',
		name: 'nonce',
		type: 'string',
		default: '',
		description:
			'A random value the ID token repeats, so the app can tell it was issued for this request. Required when the response type includes an ID token.',
	},
	{
		displayName: 'Prompt',
		name: 'oauth2Prompt',
		type: 'multiOptions',
		options: OIDC_PROMPT_OPTIONS,
		default: [],
		description:
			'Which screens the consent page shows the user. None cannot be combined with other values.',
	},
	{
		displayName: 'Resource',
		name: 'oauth2Resource',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://api.example.com/',
		description: RESOURCE_HELP,
	},
	{
		displayName: 'Scopes',
		name: 'oauth2Scopes',
		type: 'string',
		default: '',
		placeholder: 'e.g. openid email profile',
		description: SCOPES_HELP,
	},
	{
		displayName: 'State',
		name: 'oauth2State',
		type: 'string',
		default: '',
		description:
			'A value of the app that comes back unchanged on the redirect URI, to match the answer to this request',
	},
];

export const oauth2ServerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['oauth2Server'],
			},
		},
		options: [
			{
				name: 'Approve Authorization',
				value: 'approveAuthorization',
				description:
					"Record the signed-in user's consent to an authorization request, returning the URL that sends them back to the app",
				action: 'Approve authorization request',
			},
			{
				name: 'Create Device Authorization',
				value: 'createDeviceAuthorization',
				description:
					'Start sign-in on a device without a browser. The output holds the code to show the user and the secret device code to poll Create Token with.',
				action: 'Create device authorization',
			},
			{
				name: 'Create Device Grant',
				value: 'createDeviceGrant',
				description:
					"Assign the authorization request behind a device's user code to the signed-in user who entered it, returning the grant to ask consent for",
				action: 'Create device grant',
			},
			{
				name: 'Create Pushed Authorization Request',
				value: 'createPushedAuthorizationRequest',
				description:
					'Store an authorization request on the server, returning a short-lived request URI to start it with',
				action: 'Create pushed authorization request',
			},
			{
				name: 'Create Token',
				value: 'createToken',
				description:
					'Exchange an authorization code, device code, or refresh token for tokens. The output holds the access and refresh tokens.',
				action: 'Create access token',
			},
			{
				name: 'Get Authorization URL',
				value: 'getAuthorizationUrl',
				description:
					"Build the URL that asks a user to authorize an app, for the user's browser to open. Sends no request.",
				action: 'Get authorization URL',
			},
			{
				name: 'Get Grant',
				value: 'getGrant',
				description: 'Retrieve what an authorization request asks the user to consent to',
				action: 'Get authorization grant',
			},
			{
				name: 'Reject Authorization',
				value: 'rejectAuthorization',
				description:
					'Record that the signed-in user refuses an authorization request, returning the URL that sends them back to the app',
				action: 'Reject authorization request',
			},
			{
				name: 'Revoke Token',
				value: 'revokeToken',
				description: 'Revoke an access or refresh token an app holds',
				action: 'Revoke token',
			},
			{
				name: 'Start Authorization',
				value: 'startAuthorization',
				description:
					'Start an authorization request for the signed-in user, returning a grant ID to ask consent for, or the redirect URL when the user consented before',
				action: 'Start authorization request',
			},
		],
		default: 'createToken',
	},
];

export const oauth2ServerFields: INodeProperties[] = [
	{
		displayName:
			"These operations back your own consent page and device code page, set as the Authorization URL and Device Verification URL of the project's OAuth2 server settings. Start Authorization or Create Device Grant returns a grant, Get Grant shows what the app asks for, and Approve or Reject Authorization records the user's answer.",
		name: 'oauth2ConsentNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: show(CONSENT_OPERATIONS) },
	},
	userAuthenticationProperty(
		show(USER_OPERATIONS),
		"How to act as the user deciding on the request. Appwrite records consent only from the user, so the credential's API key cannot stand in.",
	),
	...userSecretProperties(show(USER_OPERATIONS)),
	clientLocator(),
	{
		displayName: 'Client Type',
		name: 'appClientType',
		type: 'options',
		options: [
			{
				name: 'Confidential',
				value: 'confidential',
				description: 'A server-side app that proves itself with its client secret',
			},
			{
				name: 'Public',
				value: 'public',
				description: 'A single-page, mobile, or native app that has no secret and uses PKCE',
			},
		],
		default: 'confidential',
		description: 'The client type of the app, as set on the app',
		displayOptions: { show: show(SECRET_OPERATIONS) },
	},
	{
		displayName: 'Client Secret',
		name: 'oauth2ClientSecret',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			"A secret of the app, created with the App resource's Create Secret operation. The request authenticates with it rather than with the credential's API key.",
		displayOptions: { show: show(SECRET_OPERATIONS, { appClientType: ['confidential'] }) },
	},
	{
		displayName: 'Grant Type',
		name: 'oauth2GrantType',
		type: 'options',
		options: [
			{
				name: 'Authorization Code',
				value: 'authorization_code',
				description: 'Exchange the code the redirect URI received after the user consented',
			},
			{
				name: 'Device Code',
				value: 'urn:ietf:params:oauth:grant-type:device_code',
				description:
					'Poll with the device code from Create Device Authorization until the user consents',
			},
			{
				name: 'Refresh Token',
				value: 'refresh_token',
				description: 'Get new tokens with a refresh token',
			},
		],
		default: 'authorization_code',
		description: 'What the app exchanges for tokens',
		displayOptions: { show: show(['createToken']) },
	},
	{
		displayName: 'Code',
		name: 'oauth2Code',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The authorization code, from the code query parameter of the redirect URI',
		displayOptions: { show: show(['createToken'], { oauth2GrantType: ['authorization_code'] }) },
	},
	{
		displayName: 'Redirect URI',
		name: 'oauth2RedirectUri',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/oauth/callback',
		description: 'The redirect URI of the authorization request the code was issued for',
		displayOptions: { show: show(['createToken'], { oauth2GrantType: ['authorization_code'] }) },
	},
	{
		displayName: 'Device Code',
		name: 'oauth2DeviceCode',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			'The device_code returned by Create Device Authorization. Until the user answers, the request fails with authorization_pending; poll no faster than its interval.',
		displayOptions: {
			show: show(['createToken'], {
				oauth2GrantType: ['urn:ietf:params:oauth:grant-type:device_code'],
			}),
		},
	},
	{
		displayName: 'Refresh Token',
		name: 'oauth2RefreshToken',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The refresh_token of an earlier Create Token response',
		displayOptions: { show: show(['createToken'], { oauth2GrantType: ['refresh_token'] }) },
	},
	{
		displayName: 'Code Verifier',
		name: 'oauth2CodeVerifier',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			'The PKCE code verifier whose code challenge the authorization request carried. Public apps always use PKCE.',
		displayOptions: {
			show: show(['createToken'], {
				appClientType: ['public'],
				oauth2GrantType: ['authorization_code'],
			}),
		},
	},
	{
		displayName: 'Authorization Request',
		name: 'oauth2RequestMode',
		type: 'options',
		options: [
			{
				name: 'Parameters',
				value: 'parameters',
				description: 'Enter the redirect URI, response type, and other details of the request',
			},
			{
				name: 'Pushed Request',
				value: 'pushed',
				description:
					'Refer to a request stored with Create Pushed Authorization Request by its request URI',
			},
		],
		default: 'parameters',
		description: 'Where the details of the authorization request come from',
		displayOptions: { show: show(REQUEST_OPERATIONS) },
	},
	{
		displayName: 'Request URI',
		name: 'oauth2RequestUri',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. urn:appwrite:oauth2:request:5e5ea5c16897e',
		description:
			'The request_uri returned by Create Pushed Authorization Request. It can start one authorization only, before it expires.',
		displayOptions: { show: show(REQUEST_OPERATIONS, { oauth2RequestMode: ['pushed'] }) },
	},
	{
		displayName: 'Redirect URI',
		name: 'oauth2RedirectUri',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/oauth/callback',
		description:
			'Where the user returns with the answer of the request. It must be one of the redirect URIs registered on the app.',
		displayOptions: {
			show: show(['createPushedAuthorizationRequest', ...REQUEST_OPERATIONS]),
			hide: { oauth2RequestMode: ['pushed'] },
		},
	},
	{
		displayName: 'Response Type',
		name: 'oauth2ResponseType',
		type: 'options',
		options: [
			{
				name: 'Code',
				value: 'code',
				description: 'An authorization code for Create Token (the authorization code flow)',
			},
			{
				name: 'Code and ID Token',
				value: 'code id_token',
				description: 'Both at once (the hybrid flow)',
			},
			{
				name: 'ID Token',
				value: 'id_token',
				description: 'Only an ID token, for OpenID Connect sign-in (the implicit flow)',
			},
		],
		default: 'code',
		description: 'What the redirect URI receives when the user consents',
		displayOptions: {
			show: show(['createPushedAuthorizationRequest', ...REQUEST_OPERATIONS]),
			hide: { oauth2RequestMode: ['pushed'] },
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: show(['createPushedAuthorizationRequest', ...REQUEST_OPERATIONS]),
			hide: { oauth2RequestMode: ['pushed'] },
		},
		options: AUTHORIZATION_OPTIONS,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['createDeviceAuthorization']) },
		options: AUTHORIZATION_OPTIONS.filter((option) =>
			['authorizationDetails', 'oauth2Resource', 'oauth2Scopes'].includes(option.name),
		),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['createToken']) },
		options: [
			{
				displayName: 'Code Verifier',
				name: 'oauth2CodeVerifier',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'The PKCE code verifier, when the authorization request carried a code challenge',
				displayOptions: {
					show: {
						'/appClientType': ['confidential'],
						'/oauth2GrantType': ['authorization_code'],
					},
				},
			},
			{
				displayName: 'Resource',
				name: 'oauth2Resource',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://api.example.com/',
				description: `${RESOURCE_HELP}. Narrows the tokens to some of the resources the user consented to.`,
			},
		],
	},
	{
		displayName: 'Token',
		name: 'oauth2Token',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The access or refresh token to revoke',
		displayOptions: { show: show(['revokeToken']) },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['revokeToken']) },
		options: [
			{
				displayName: 'Token Type',
				name: 'oauth2TokenTypeHint',
				type: 'options',
				options: [
					{ name: 'Access Token', value: 'access_token' },
					{ name: 'Refresh Token', value: 'refresh_token' },
				],
				default: 'access_token',
				description: 'Which kind of token it is, to speed up the lookup',
			},
		],
	},
	{
		displayName: 'User Code',
		name: 'oauth2UserCode',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. ABCD-EFGH',
		description:
			'The code the device showed and the user entered on your device code page, the user_code of Create Device Authorization',
		displayOptions: { show: show(['createDeviceGrant']) },
	},
	{
		displayName: 'Grant ID',
		name: 'oauth2GrantId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The ID of the grant, from Start Authorization, Create Device Grant, or the grant_id query parameter of your consent page',
		displayOptions: { show: show(['approveAuthorization', 'getGrant', 'rejectAuthorization']) },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show(['approveAuthorization']) },
		options: [
			{
				displayName: 'Authorization Details',
				name: 'authorizationDetails',
				type: 'json',
				default: '[]',
				description:
					'The details the user agreed to, replacing those requested, e.g. with the concrete records the user picked. Each must use a type the project accepts. Leave empty to keep the requested details.',
			},
			{
				displayName: 'Scopes',
				name: 'oauth2Scopes',
				type: 'string',
				default: '',
				placeholder: 'e.g. openid email',
				description:
					'The scopes the user agreed to, space- or comma-separated: some of the requested ones. Identity scopes such as openid are always kept. Leave empty to grant all requested scopes.',
			},
		],
	},
	simplifyProperty('oauth2Server', ['getGrant']),
];
