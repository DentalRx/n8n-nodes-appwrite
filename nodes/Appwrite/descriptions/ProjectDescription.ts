import type { INodeProperties } from 'n8n-workflow';

import { policyProperties } from './projectPolicies';
import { returnAllAndLimitProperties, simplifyProperty } from './shared';

export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['project'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete the project and all its data permanently',
				action: 'Delete project',
			},
			{
				name: 'Get',
				value: 'get',
				description: "Retrieve the project's settings",
				action: 'Get project',
			},
			{
				name: 'Get Many Policies',
				value: 'getManyPolicies',
				description: "Retrieve the settings of each of the project's auth security policies",
				action: 'Get many project policies',
			},
			{
				name: 'Get Policy',
				value: 'getPolicy',
				description: 'Retrieve the settings of one auth security policy',
				action: 'Get project policy',
			},
			{
				name: 'Send Test Email',
				value: 'sendTestEmail',
				description: "Send a test email through the project's custom SMTP server",
				action: 'Send project test email',
			},
			{
				name: 'Update Auth Method',
				value: 'updateAuthMethod',
				description: 'Turn a way of signing in, such as magic URL or phone, on or off',
				action: 'Update project auth method',
			},
			{
				name: 'Update Labels',
				value: 'updateLabels',
				description: "Replace the labels used to find the project in the organization's list",
				action: 'Update project labels',
			},
			{
				name: 'Update OAuth2 Server',
				value: 'updateOAuth2Server',
				description:
					'Configure the project as an OAuth2 and OpenID Connect provider for other apps',
				action: 'Update project authorization server',
			},
			{
				name: 'Update Policy',
				value: 'updatePolicy',
				description: 'Change an auth security policy, such as password strength or session length',
				action: 'Update project policy',
			},
			{
				name: 'Update Protocol',
				value: 'updateProtocol',
				description: 'Turn the REST, GraphQL, or WebSocket API on or off for apps and websites',
				action: 'Update project protocol',
			},
			{
				name: 'Update Service',
				value: 'updateService',
				description:
					'Turn an Appwrite service, such as Storage or Functions, on or off for apps and websites',
				action: 'Update project service',
			},
			{
				name: 'Update SMTP',
				value: 'updateSmtp',
				description: 'Configure the custom SMTP server the project sends its emails through',
				action: 'Update project SMTP',
			},
		],
		default: 'get',
	},
];

const show = (operation: string) => ({ resource: ['project'], operation: [operation] });

export const projectFields: INodeProperties[] = [
	{
		displayName:
			'This deletes the project the credential belongs to, with all its databases, files, users, and functions. It cannot be undone.',
		name: 'projectDeleteNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: show('delete') },
	},
	simplifyProperty('project', ['get']),
	{
		displayName: 'Auth Method',
		name: 'authMethod',
		type: 'options',
		options: [
			{ name: 'Anonymous', value: 'anonymous' },
			{ name: 'Email OTP', value: 'email-otp', description: 'One-time codes sent by email' },
			{ name: 'Email/Password', value: 'email-password' },
			{ name: 'JWT', value: 'jwt', description: 'Short-lived tokens that act on behalf of a user' },
			{ name: 'Magic URL', value: 'magic-url', description: 'Sign-in links sent by email' },
			{ name: 'Phone', value: 'phone', description: 'One-time codes sent by SMS' },
			{
				name: 'Team Invites',
				value: 'invites',
				description: 'Users joining through a team invitation',
			},
		],
		default: 'email-password',
		description: 'The way of signing in to turn on or off',
		displayOptions: { show: show('updateAuthMethod') },
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description:
			"Whether users can sign in this way. Requests made with an API key, like this node's, are not affected.",
		displayOptions: { show: show('updateAuthMethod') },
	},
	{
		displayName: 'Labels',
		name: 'labels',
		type: 'string',
		default: '',
		placeholder: 'e.g. production, eu',
		description:
			'The labels to set, as a comma-separated list or a JSON array. Replaces all current labels; leave empty to remove them all. Each label can be up to 36 letters and digits.',
		displayOptions: { show: show('updateLabels') },
	},
	{
		displayName: 'Protocol',
		name: 'projectProtocol',
		type: 'options',
		options: [
			{ name: 'GraphQL', value: 'graphql' },
			{ name: 'REST', value: 'rest' },
			{ name: 'WebSocket', value: 'websocket', description: 'Realtime subscriptions' },
		],
		default: 'rest',
		description: 'The API protocol to turn on or off',
		displayOptions: { show: show('updateProtocol') },
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description:
			"Whether apps and websites can reach the project over this protocol. Requests made with an API key, like this node's, are not affected.",
		displayOptions: { show: show('updateProtocol') },
	},
	{
		displayName: 'Service',
		name: 'projectService',
		type: 'options',
		options: [
			{ name: 'Account', value: 'account' },
			{ name: 'Advisor', value: 'advisor' },
			{ name: 'Avatars', value: 'avatars' },
			{ name: 'Databases (Legacy)', value: 'databases' },
			{ name: 'Functions', value: 'functions' },
			{ name: 'GraphQL', value: 'graphql' },
			{ name: 'Health', value: 'health' },
			{ name: 'Locale', value: 'locale' },
			{ name: 'Messaging', value: 'messaging' },
			{ name: 'Migrations', value: 'migrations' },
			{ name: 'OAuth2', value: 'oauth2' },
			{ name: 'Project', value: 'project' },
			{ name: 'Proxy', value: 'proxy' },
			{ name: 'Sites', value: 'sites' },
			{ name: 'Storage', value: 'storage' },
			{ name: 'TablesDB', value: 'tablesdb' },
			{ name: 'Teams', value: 'teams' },
			{ name: 'Users', value: 'users' },
			{ name: 'VCS', value: 'vcs', description: 'Git repository connections' },
		],
		default: 'account',
		description: 'The Appwrite service to turn on or off',
		displayOptions: { show: show('updateService') },
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description:
			"Whether apps and websites can use the service. Requests made with an API key, like this node's, are not affected.",
		displayOptions: { show: show('updateService') },
	},
	{
		displayName: 'Recipients',
		name: 'testEmailRecipients',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. nathan@example.com, anna@example.com',
		description:
			'Up to 10 email addresses to send the test email to, as a comma-separated list or a JSON array',
		displayOptions: { show: show('sendTestEmail') },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description:
			'The SMTP settings to change. Settings you do not add keep their current values; a text setting added and left empty is cleared.',
		displayOptions: { show: show('updateSmtp') },
		options: [
			{
				displayName: 'Enabled',
				name: 'smtpEnabled',
				type: 'boolean',
				default: true,
				description:
					"Whether the project sends its emails through this SMTP server instead of Appwrite's. Custom email templates need it. Turning it on makes Appwrite connect to the server first, and the update fails if it cannot. Left out, Appwrite turns it on by itself once the settings connect.",
			},
			{
				displayName: 'Encryption',
				name: 'smtpSecure',
				type: 'options',
				options: [
					{
						name: 'SSL',
						value: 'ssl',
						description: 'Encrypted from the start, usually on port 465',
					},
					{ name: 'TLS', value: 'tls', description: 'Upgraded with STARTTLS, usually on port 587' },
				],
				default: 'tls',
				description:
					'How the connection to the SMTP server is encrypted. Appwrite does not encrypt it unless this is set.',
			},
			{
				displayName: 'Host',
				name: 'smtpHost',
				type: 'string',
				default: '',
				placeholder: 'e.g. smtp.example.com',
				description: 'The hostname of the SMTP server. Left empty, the current host is kept.',
			},
			{
				displayName: 'Password',
				name: 'smtpPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'The password for the SMTP server. Appwrite stores it write-only, so it always reads back empty.',
			},
			{
				displayName: 'Port',
				name: 'smtpPort',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 65535 },
				default: 587,
				description: 'The port of the SMTP server',
			},
			{
				displayName: 'Reply-To Email',
				name: 'smtpReplyToEmail',
				type: 'string',
				default: '',
				placeholder: 'e.g. support@example.com',
				description: 'The address replies to the emails go to',
			},
			{
				displayName: 'Reply-To Name',
				name: 'smtpReplyToName',
				type: 'string',
				default: '',
				placeholder: 'e.g. Support Team',
				description: 'The name replies to the emails are addressed to',
			},
			{
				displayName: 'Sender Email',
				name: 'smtpSenderEmail',
				type: 'string',
				default: '',
				placeholder: 'e.g. noreply@example.com',
				description: 'The address the emails come from. Required to turn custom SMTP on.',
			},
			{
				displayName: 'Sender Name',
				name: 'smtpSenderName',
				type: 'string',
				default: '',
				placeholder: 'e.g. Example App',
				description: 'The name shown in the inbox as the sender of the emails',
			},
			{
				displayName: 'Username',
				name: 'smtpUsername',
				type: 'string',
				default: '',
				description: 'The username for the SMTP server',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description:
			'The OAuth2 server settings to change. Settings you do not add keep their current values. Appwrite needs an Authorization URL, so add one if the project has none yet.',
		displayOptions: { show: show('updateOAuth2Server') },
		options: [
			{
				displayName: 'Access Token Lifetime (Seconds)',
				name: 'oauth2ServerAccessTokenDuration',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 28800,
				description:
					'How long access tokens issued to confidential clients (server-side apps with a client secret) stay valid. Appwrite defaults to 8 hours.',
			},
			{
				displayName: 'Allowed Scopes',
				name: 'oauth2ServerScopes',
				type: 'string',
				default: '',
				placeholder: 'e.g. openid, email, profile',
				description:
					'The scopes apps may request, as a comma-separated list or a JSON array. Up to 100.',
			},
			{
				displayName: 'Authorization Details Types',
				name: 'oauth2ServerAuthorizationDetailsTypes',
				type: 'string',
				default: '',
				placeholder: 'e.g. payment_initiation',
				description:
					'The authorization_details types (RFC 9396) the server accepts, as a comma-separated list or a JSON array. Up to 100.',
			},
			{
				displayName: 'Authorization URL',
				name: 'oauth2ServerAuthorizationUrl',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com/oauth/consent',
				description: 'The page of your app that shows users the consent screen',
			},
			{
				displayName: 'Default Scopes',
				name: 'oauth2ServerDefaultScopes',
				type: 'string',
				default: '',
				placeholder: 'e.g. openid, email',
				description:
					'The scopes granted when an authorization request names none, as a comma-separated list or a JSON array. Each must also be an allowed scope.',
			},
			{
				displayName: 'Device Code Characters',
				name: 'oauth2ServerUserCodeFormat',
				type: 'options',
				options: [
					{ name: 'Alphabetic', value: 'alphabetic', description: 'Letters only' },
					{
						name: 'Alphanumeric',
						value: 'alphanumeric',
						description: 'Letters and digits, the hardest to guess',
					},
					{
						name: 'Numeric',
						value: 'numeric',
						description: 'Digits only, easiest on keypads and TV remotes',
					},
				],
				default: 'alphanumeric',
				description: 'Which characters the codes users type on a device use',
			},
			{
				displayName: 'Device Code Length',
				name: 'oauth2ServerUserCodeLength',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 8,
				description:
					'How many characters the codes users type on a device have, not counting the separator. Shorter codes are easier to type but easier to guess.',
			},
			{
				displayName: 'Device Code Lifetime (Seconds)',
				name: 'oauth2ServerDeviceCodeDuration',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 600,
				description: 'How long the codes of the device sign-in flow stay valid',
			},
			{
				displayName: 'Device Verification URL',
				name: 'oauth2ServerVerificationUrl',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com/device',
				description:
					'The page of your app where users enter the code shown on a device. Required to allow sign-in from devices such as TVs.',
			},
			{
				displayName: 'Enabled',
				name: 'oauth2ServerEnabled',
				type: 'boolean',
				default: true,
				description:
					'Whether other apps can sign users in with this project, using it as their OAuth2 and OpenID Connect provider',
			},
			{
				displayName: 'Installation Access Token Lifetime (Seconds)',
				name: 'oauth2ServerInstallationAccessTokenDuration',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 3600,
				description:
					'How long access tokens of app installations stay valid. Appwrite defaults to 1 hour.',
			},
			{
				displayName: 'Installation Scopes',
				name: 'oauth2ServerInstallationScopes',
				type: 'string',
				default: '',
				description:
					'The scopes an app may request when it is installed on a team, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'Public Access Token Lifetime (Seconds)',
				name: 'oauth2ServerPublicAccessTokenDuration',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 3600,
				description:
					'How long access tokens issued to public clients (browser, mobile, and native apps without a client secret) stay valid. Appwrite defaults to 1 hour.',
			},
			{
				displayName: 'Public Refresh Token Lifetime (Seconds)',
				name: 'oauth2ServerPublicRefreshTokenDuration',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 2592000,
				description:
					'How long refresh tokens issued to public clients stay valid. Appwrite defaults to 30 days.',
			},
			{
				displayName: 'Refresh Token Lifetime (Seconds)',
				name: 'oauth2ServerRefreshTokenDuration',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 31536000,
				description:
					'How long refresh tokens issued to confidential clients stay valid. Appwrite defaults to 1 year.',
			},
			{
				displayName: 'Require PKCE for Confidential Clients',
				name: 'oauth2ServerConfidentialPkce',
				type: 'boolean',
				default: true,
				description:
					'Whether server-side apps that authenticate with a client secret must also use PKCE. Public clients always must.',
			},
		],
	},
	...policyProperties('project'),
	...returnAllAndLimitProperties('project', ['getManyPolicies']),
];
