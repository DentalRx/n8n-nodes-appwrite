import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

/**
 * The OAuth2 sign-in providers Appwrite offers, each with exactly the settings
 * its update endpoint (`PATCH /project/oauth2/<provider>`) accepts. The
 * provider's Update operation shows one Update Fields collection per entry,
 * and the operation sends each field the user added under its body key.
 *
 * Settings with the same role share a parameter name across providers (the
 * app's ID is always `oauth2ClientId`, whatever the provider calls it), so a
 * workflow reads the same whichever provider it configures, while the label
 * and the request body key follow the provider's own terminology.
 */

/** One setting of a provider: the node parameter and the body key it fills. */
export interface OAuth2ProviderField {
	/** The key Appwrite expects in the request body, e.g. `appKey` for Dropbox. */
	body: string;
	/** The option shown in the provider's Update Fields collection. */
	property: INodeProperties;
	/** Whether the value is entered as a comma-separated list or JSON array and sent as an array. */
	list?: boolean;
}

export interface OAuth2Provider {
	/** The provider ID Appwrite uses in paths, e.g. `paypalSandbox`. */
	value: string;
	/** The brand name shown in the Provider dropdown. */
	name: string;
	fields: OAuth2ProviderField[];
}

function text(
	name: string,
	body: string,
	displayName: string,
	description: string,
	placeholder?: string,
): OAuth2ProviderField {
	return {
		body,
		property: {
			displayName,
			name,
			type: 'string',
			default: '',
			description,
			...(placeholder === undefined ? {} : { placeholder }),
		},
	};
}

function secret(
	name: string,
	body: string,
	displayName: string,
	description: string,
): OAuth2ProviderField {
	return {
		body,
		property: {
			displayName,
			name,
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description,
		},
	};
}

function toggle(
	name: string,
	body: string,
	displayName: string,
	description: string,
): OAuth2ProviderField {
	return { body, property: { displayName, name, type: 'boolean', default: true, description } };
}

/** A label and an optional extra sentence, as a provider's developer console words them. */
type Label = [body: string, displayName: string, hint?: string];

/**
 * The app ID and secret nearly every provider takes, named as in the
 * provider's developer console: Dropbox issues an "App Key", Salesforce a
 * "Consumer Key", and so on.
 */
function credentials(
	brand: string,
	[idBody, idLabel, idHint]: Label = ['clientId', 'Client ID'],
	[secretBody, secretLabel, secretHint]: Label = ['clientSecret', 'Client Secret'],
): OAuth2ProviderField[] {
	const describe = (label: string, hint?: string): string =>
		hint === undefined
			? `The ${label} of your ${brand} OAuth2 app`
			: `The ${label} of your ${brand} OAuth2 app. ${hint}.`;
	return [
		text('oauth2ClientId', idBody, idLabel, describe(idLabel, idHint)),
		secret('oauth2ClientSecret', secretBody, secretLabel, describe(secretLabel, secretHint)),
	];
}

/** Browser sign-in, the switch every provider has. */
function enabled(brand: string, via = ''): OAuth2ProviderField {
	return toggle(
		'enabled',
		'enabled',
		'Enabled',
		`Whether users can sign in with ${brand}${via}. Turning it on makes Appwrite verify the credentials first, and the update fails if they are invalid. Left out, Appwrite turns the provider on by itself once complete, valid credentials are saved.`,
	);
}

/** A provider that takes only an app ID, its secret, and the on/off switch. */
function standard(value: string, name: string, id?: Label, clientSecret?: Label): OAuth2Provider {
	return { value, name, fields: [...credentials(name, id, clientSecret), enabled(name)] };
}

/** The address of a self-hosted or tenant-specific identity server. */
function domain(brand: string, body: string, placeholder: string): OAuth2ProviderField {
	return text(
		'oauth2Domain',
		body,
		'Domain',
		`The domain of your ${brand} instance, without https://`,
		placeholder,
	);
}

/**
 * Native sign-in, which creates sessions from ID tokens an app obtained on the
 * device (Apple and Google). `audience` is the ID always accepted; the list
 * adds the IDs of the native apps.
 */
function nativeSignIn(
	brand: string,
	audience: string,
	[displayName, whose, placeholder]: [string, string, string],
): OAuth2ProviderField[] {
	return [
		{
			...text(
				'oauth2NativeClientIds',
				'nativeClientIds',
				displayName,
				`The ${whose} whose on-device ${brand} sign-in tokens Appwrite accepts, as a comma-separated list or a JSON array. Together with the ${audience}, these are the only IDs trusted. Leave empty to clear the list.`,
				placeholder,
			),
			list: true,
		},
		toggle(
			'oauth2NativeEnabled',
			'nativeEnabled',
			'Native Sign-In',
			`Whether apps can create sessions from ${brand} ID tokens obtained on the device. This is separate from browser sign-in and needs the ${audience} or a native ID, but no secret.`,
		),
	];
}

function prompt(brand: string, options: INodePropertyOptions[]): OAuth2ProviderField {
	return {
		body: 'prompt',
		property: {
			displayName: 'Prompt',
			name: 'oauth2Prompt',
			type: 'multiOptions',
			options,
			default: [],
			description: `Which screens ${brand} shows during sign-in. None cannot be combined with other values.`,
		},
	};
}

const CONSENT: INodePropertyOptions = {
	name: 'Consent',
	value: 'consent',
	description: 'Ask the user for consent',
};
const NONE: INodePropertyOptions = {
	name: 'None',
	value: 'none',
	description: 'Show no sign-in or consent screens',
};
const SELECT_ACCOUNT: INodePropertyOptions = {
	name: 'Select Account',
	value: 'select_account',
	description: 'Ask the user to pick an account',
};
const LOGIN: INodePropertyOptions = {
	name: 'Login',
	value: 'login',
	description: 'Ask the user to sign in again',
};

/**
 * Every OpenID Connect prompt value. The OAuth2 Server resource offers them
 * too, for the requests other apps send to the project.
 */
export const OIDC_PROMPT_OPTIONS = [CONSENT, LOGIN, NONE, SELECT_ACCOUNT];

/** One of the endpoint URLs of an OpenID Connect provider. */
function oidcUrl(
	name: string,
	body: string,
	displayName: string,
	description: string,
	path: string,
): OAuth2ProviderField {
	return text(name, body, displayName, description, `e.g. https://auth.example.com${path}`);
}

export const OAUTH2_PROVIDERS: OAuth2Provider[] = [
	standard('amazon', 'Amazon'),
	{
		value: 'apple',
		name: 'Apple',
		fields: [
			text(
				'oauth2ClientId',
				'serviceId',
				'Services ID',
				'The Services ID of your Sign in with Apple configuration',
				'e.g. ip.appwrite.app.web',
			),
			text(
				'oauth2KeyId',
				'keyId',
				'Key ID',
				'The ID of the private key you created for Sign in with Apple',
				'e.g. P4000000N8',
			),
			text('oauth2TeamId', 'teamId', 'Team ID', 'Your Apple Developer team ID', 'e.g. D4000000R6'),
			secret(
				'oauth2PrivateKey',
				'p8File',
				'Private Key',
				'The contents of the .p8 private key file, including its BEGIN and END lines',
			),
			...nativeSignIn('Apple', 'Services ID', [
				'Native Bundle IDs',
				'bundle IDs of your apps',
				'e.g. com.example.app',
			]),
			enabled('Apple', ' through the browser'),
		],
	},
	standard('appwrite', 'Appwrite'),
	{
		value: 'auth0',
		name: 'Auth0',
		fields: [
			...credentials('Auth0'),
			domain('Auth0', 'endpoint', 'e.g. example.us.auth0.com'),
			enabled('Auth0'),
		],
	},
	{
		value: 'authentik',
		name: 'Authentik',
		fields: [
			...credentials('Authentik'),
			domain('Authentik', 'endpoint', 'e.g. example.authentik.com'),
			enabled('Authentik'),
		],
	},
	standard('autodesk', 'Autodesk'),
	standard('bitbucket', 'Bitbucket', ['key', 'Key'], ['secret', 'Secret']),
	standard('bitly', 'Bitly'),
	standard('box', 'Box'),
	standard('cloudflare', 'Cloudflare'),
	standard('dailymotion', 'Dailymotion', ['apiKey', 'API Key'], ['apiSecret', 'API Secret']),
	standard('discord', 'Discord'),
	standard(
		'disqus',
		'Disqus',
		['publicKey', 'Public Key', 'Disqus also calls it the API Key'],
		['secretKey', 'Secret Key', 'Disqus also calls it the API Secret'],
	),
	standard('dropbox', 'Dropbox', ['appKey', 'App Key'], ['appSecret', 'App Secret']),
	standard('etsy', 'Etsy', ['keyString', 'Keystring'], ['sharedSecret', 'Shared Secret']),
	standard('facebook', 'Facebook', ['appId', 'App ID'], ['appSecret', 'App Secret']),
	standard('figma', 'Figma'),
	{
		value: 'fusionauth',
		name: 'FusionAuth',
		fields: [
			...credentials('FusionAuth'),
			domain('FusionAuth', 'endpoint', 'e.g. example.fusionauth.io'),
			enabled('FusionAuth'),
		],
	},
	standard('github', 'GitHub'),
	{
		value: 'gitlab',
		name: 'GitLab',
		fields: [
			...credentials('GitLab', ['applicationId', 'Application ID'], ['secret', 'Secret']),
			text(
				'oauth2Endpoint',
				'endpoint',
				'Endpoint URL',
				'The URL of your GitLab instance. Only needed for self-hosted GitLab.',
				'e.g. https://gitlab.com',
			),
			enabled('GitLab'),
		],
	},
	{
		value: 'google',
		name: 'Google',
		fields: [
			...credentials('Google'),
			prompt('Google', [CONSENT, NONE, SELECT_ACCOUNT]),
			...nativeSignIn('Google', 'Client ID', [
				'Native Client IDs',
				'Android and iOS client IDs',
				'e.g. 1234-abc.apps.googleusercontent.com',
			]),
			enabled('Google', ' through the browser'),
		],
	},
	standard('huggingface', 'Hugging Face'),
	standard(
		'kakao',
		'Kakao',
		['clientId', 'REST API Key'],
		[
			'clientSecret',
			'Client Secret',
			'Generate it in the Security settings of Kakao Login and set its status to enabled',
		],
	),
	{
		value: 'keycloak',
		name: 'Keycloak',
		fields: [
			...credentials('Keycloak'),
			domain('Keycloak', 'endpoint', 'e.g. keycloak.example.com'),
			text(
				'oauth2RealmName',
				'realmName',
				'Realm Name',
				'The Keycloak realm your app belongs to',
				'e.g. appwrite-realm',
			),
			enabled('Keycloak'),
		],
	},
	standard('kick', 'Kick'),
	standard(
		'linkedin',
		'LinkedIn',
		['clientId', 'Client ID'],
		['primaryClientSecret', 'Client Secret', 'Either the primary or the secondary secret works'],
	),
	{
		value: 'microsoft',
		name: 'Microsoft',
		fields: [
			...credentials(
				'Microsoft',
				['applicationId', 'Application (Client) ID', 'Find it in Microsoft Entra ID'],
				['applicationSecret', 'Client Secret'],
			),
			text(
				'oauth2Tenant',
				'tenant',
				'Tenant',
				'Which Microsoft accounts can sign in: common (any account), organizations (work or school accounts), consumers (personal accounts), or a specific tenant ID',
				'e.g. common',
			),
			enabled('Microsoft'),
		],
	},
	standard(
		'notion',
		'Notion',
		['oauthClientId', 'OAuth Client ID'],
		['oauthClientSecret', 'OAuth Client Secret'],
	),
	{
		value: 'oidc',
		name: 'OIDC',
		fields: [
			...credentials('OpenID Connect'),
			oidcUrl(
				'oauth2WellKnownUrl',
				'wellKnownURL',
				'Well-Known URL',
				"The provider's OpenID Connect discovery document. When set, Appwrite finds the authorization, token, and user info URLs by itself.",
				'/.well-known/openid-configuration',
			),
			oidcUrl(
				'oauth2AuthorizationUrl',
				'authorizationURL',
				'Authorization URL',
				'The authorization endpoint. Required when there is no Well-Known URL.',
				'/oauth2/authorize',
			),
			oidcUrl(
				'oauth2TokenUrl',
				'tokenURL',
				'Token URL',
				'The token endpoint. Required when there is no Well-Known URL.',
				'/oauth2/token',
			),
			oidcUrl(
				'oauth2UserInfoUrl',
				'userInfoURL',
				'User Info URL',
				'The user info endpoint. Required when there is no Well-Known URL.',
				'/oauth2/userinfo',
			),
			prompt('the provider', OIDC_PROMPT_OPTIONS),
			{
				body: 'maxAge',
				property: {
					displayName: 'Max Authentication Age',
					name: 'oauth2MaxAge',
					type: 'number',
					typeOptions: { minValue: 0 },
					default: 3600,
					description:
						'How recently, in seconds, the user must have signed in to the provider. Older sign-ins are asked to sign in again.',
				},
			},
			enabled('OpenID Connect'),
		],
	},
	{
		value: 'okta',
		name: 'Okta',
		fields: [
			...credentials('Okta'),
			text(
				'oauth2Domain',
				'domain',
				'Domain',
				'Your Okta company domain, without https:// and without -admin. Required to turn the provider on.',
				'e.g. trial-6400025.okta.com',
			),
			text(
				'oauth2AuthorizationServerId',
				'authorizationServerId',
				'Authorization Server ID',
				'The ID of a custom authorization server. Leave empty to use the default one.',
				'e.g. aus000000000000000h7z',
			),
			enabled('Okta'),
		],
	},
	standard('paypal', 'PayPal', ['clientId', 'Client ID'], ['secretKey', 'Secret Key']),
	standard(
		'paypalSandbox',
		'PayPal Sandbox',
		['clientId', 'Client ID'],
		['secretKey', 'Secret Key'],
	),
	standard('podio', 'Podio'),
	standard('resend', 'Resend'),
	standard(
		'salesforce',
		'Salesforce',
		['customerKey', 'Consumer Key'],
		['customerSecret', 'Consumer Secret'],
	),
	standard('slack', 'Slack'),
	standard('spotify', 'Spotify'),
	standard('stripe', 'Stripe', ['clientId', 'Client ID'], ['apiSecretKey', 'API Secret Key']),
	standard('tiktok', 'TikTok', ['clientId', 'Client Key']),
	standard(
		'tradeshift',
		'Tradeshift',
		['oauth2ClientId', 'OAuth2 Client ID'],
		['oauth2ClientSecret', 'OAuth2 Client Secret'],
	),
	standard(
		'tradeshiftBox',
		'Tradeshift Sandbox',
		['oauth2ClientId', 'OAuth2 Client ID'],
		['oauth2ClientSecret', 'OAuth2 Client Secret'],
	),
	standard('twitch', 'Twitch'),
	standard('wordpress', 'WordPress'),
	standard('x', 'X', ['customerKey', 'Customer Key'], ['secretKey', 'Secret Key']),
	standard(
		'yahoo',
		'Yahoo',
		['clientId', 'Client ID', 'Yahoo also calls it the Consumer Key'],
		['clientSecret', 'Client Secret', 'Yahoo also calls it the Consumer Secret'],
	),
	standard('yandex', 'Yandex'),
	standard('zoho', 'Zoho'),
	standard('zoom', 'Zoom'),
];
