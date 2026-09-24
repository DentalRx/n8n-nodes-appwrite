import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { providerLocator } from './locators';
import { listOptionsProperty, queriesProperties, returnAllAndLimitProperties } from './shared';

export const providerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['provider'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new email, SMS, or push provider',
				action: 'Create provider',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a provider permanently',
				action: 'Delete provider',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single provider by its ID',
				action: 'Get provider',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List providers, with optional filters',
				action: 'Get many providers',
			},
			{
				name: 'Update',
				value: 'update',
				description: "Change a provider's name, settings, or credentials",
				action: 'Update provider',
			},
		],
		default: 'get',
	},
];

const apiKey = (service: string): INodeProperties => ({
	displayName: 'API Key',
	name: 'apiKey',
	type: 'string',
	typeOptions: { password: true },
	default: '',
	description: `The ${service} API key`,
});

/** Who an email provider sends as, and where replies go. */
const emailSenderSettings: INodeProperties[] = [
	{
		displayName: 'Reply-To Email',
		name: 'replyToEmail',
		type: 'string',
		default: '',
		placeholder: 'e.g. support@example.com',
		description: 'The email address replies go to. Defaults to the sender email.',
	},
	{
		displayName: 'Reply-To Name',
		name: 'replyToName',
		type: 'string',
		default: '',
		description: 'The name replies go to. Defaults to the sender name.',
	},
	{
		displayName: 'Sender Email',
		name: 'fromEmail',
		type: 'string',
		default: '',
		placeholder: 'e.g. nathan@example.com',
		description: 'The email address messages are sent from',
	},
	{
		displayName: 'Sender Name',
		name: 'fromName',
		type: 'string',
		default: '',
		description: 'The name messages are sent from',
	},
];

const senderNumber: INodeProperties = {
	displayName: 'Sender Number',
	name: 'from',
	type: 'string',
	default: '',
	placeholder: 'e.g. +16175551212',
	description: 'The phone number messages are sent from, with a leading + and the country code',
};

const smtpHost: Omit<INodeProperties, 'name'> = {
	displayName: 'Host',
	type: 'string',
	default: '',
	placeholder: 'e.g. smtp.example.com',
	description:
		'The host name of the SMTP server. To try several servers in order, separate them with semicolons; each can name its own port and encryption, e.g. tls://smtp1.example.com:587;ssl://smtp2.example.com:465.',
};

/**
 * Create's Enabled option. Appwrite creates a provider disabled unless asked,
 * and even then only when it holds everything needed to send.
 */
const enabledOnCreate: INodeProperties = {
	displayName: 'Enabled',
	name: 'enabled',
	type: 'boolean',
	default: false,
	description:
		'Whether to enable the provider so messages can be sent through it. Appwrite enables it only when every setting it needs to send is filled in, and creates it disabled otherwise.',
};

/** The Update Fields every provider type offers. */
const commonUpdateFields: INodeProperties[] = [
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description:
			'Whether the provider is enabled. Appwrite refuses to enable a provider until every setting it needs to send is filled in.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The name of the provider',
	},
];

interface ProviderType {
	/** The Provider Type dropdown entry. Its value is the endpoints' path segment. */
	option: INodePropertyOptions & { value: string };
	/**
	 * The type's settings besides Name and Enabled, named exactly as Appwrite
	 * names them in the request body.
	 */
	settings: INodeProperties[];
	/** Settings only Update Fields offers, because Create shows them on the node's face. */
	updateOnlySettings?: INodeProperties[];
	/** Replaces `enabledOnCreate` for a type Appwrite enables by default. */
	enabledOnCreate?: INodeProperties;
}

/**
 * One entry per Appwrite provider endpoint pair (`POST /messaging/providers/<type>`
 * and `PATCH /messaging/providers/<type>/{providerId}`), sorted by name.
 */
const PROVIDER_TYPES: ProviderType[] = [
	{
		option: {
			name: 'Amazon SES',
			value: 'ses',
			description:
				'Send email through Amazon Simple Email Service. Requires Appwrite 1.9 or newer.',
		},
		settings: [
			{
				displayName: 'Access Key ID',
				name: 'accessKey',
				type: 'string',
				default: '',
				description: 'The ID of the AWS access key to send with',
			},
			{
				displayName: 'Region',
				name: 'region',
				type: 'string',
				default: '',
				placeholder: 'e.g. us-east-1',
				description: 'The AWS region to send from',
			},
			{
				displayName: 'Secret Access Key',
				name: 'secretKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The secret of the AWS access key',
			},
			...emailSenderSettings,
		],
	},
	{
		option: {
			name: 'Apple Push Notification Service (APNs)',
			value: 'apns',
			description: 'Send push notifications to iOS, iPadOS, and macOS apps',
		},
		settings: [
			{
				displayName: 'Auth Key',
				name: 'authKey',
				type: 'string',
				typeOptions: { password: true, rows: 4 },
				default: '',
				description:
					'The contents of the .p8 authentication key file from your Apple Developer account',
			},
			{
				displayName: 'Auth Key ID',
				name: 'authKeyId',
				type: 'string',
				default: '',
				placeholder: 'e.g. 2X9R4HXF34',
				description: 'The ID of the authentication key',
			},
			{
				displayName: 'Bundle ID',
				name: 'bundleId',
				type: 'string',
				default: '',
				placeholder: 'e.g. com.example.app',
				description: 'The bundle ID of the app to notify',
			},
			{
				displayName: 'Sandbox',
				name: 'sandbox',
				type: 'boolean',
				default: false,
				description:
					'Whether to send through the APNs sandbox environment, for development builds of the app',
			},
			{
				displayName: 'Team ID',
				name: 'teamId',
				type: 'string',
				default: '',
				placeholder: 'e.g. DEF123GHIJ',
				description: 'The ID of your Apple Developer team',
			},
		],
	},
	{
		option: {
			name: 'Appwrite',
			value: 'appwrite',
			description:
				'Deliver push notifications through Appwrite itself, with no third-party service. Requires Appwrite 2.3 or newer.',
		},
		// The Appwrite provider needs no credentials, so Appwrite enables it by default.
		enabledOnCreate: {
			displayName: 'Enabled',
			name: 'enabled',
			type: 'boolean',
			default: true,
			description: 'Whether to enable the provider so messages can be sent through it',
		},
		settings: [
			{
				displayName: 'Delivery Guarantee',
				name: 'qos',
				type: 'options',
				options: [
					{
						name: 'At Least Once',
						value: 'atLeastOnce',
						description:
							'Store each message and deliver it again to devices that reconnect without having received it (MQTT QoS 1)',
					},
					{
						name: 'At Most Once',
						value: 'atMostOnce',
						description:
							'Deliver each message only to devices connected when it is sent (MQTT QoS 0)',
					},
					{
						name: 'Subscriber Chooses',
						value: 'subscriber',
						description: 'Leave the choice to each subscriber',
					},
				],
				default: 'subscriber',
				description: 'The default delivery guarantee for topics on this provider',
			},
			{
				displayName: 'Message Retention (Seconds)',
				name: 'expiry',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 604800 },
				default: 0,
				description:
					'How long to keep messages for devices that are offline. At most 604800 (7 days).',
			},
		],
	},
	{
		option: {
			name: 'Firebase Cloud Messaging (FCM)',
			value: 'fcm',
			description: 'Send push notifications to Android, Apple, and web apps',
		},
		settings: [
			{
				displayName: 'Service Account JSON',
				name: 'serviceAccountJSON',
				type: 'string',
				typeOptions: { password: true, rows: 4 },
				default: '',
				description:
					'The contents of the service account key file (a JSON object) from your Firebase project settings',
			},
		],
	},
	{
		option: { name: 'Mailgun', value: 'mailgun', description: 'Send email through Mailgun' },
		settings: [
			apiKey('Mailgun'),
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				placeholder: 'e.g. mg.example.com',
				description: 'The Mailgun domain to send from',
			},
			{
				displayName: 'EU Region',
				name: 'isEuRegion',
				type: 'boolean',
				default: false,
				description: 'Whether the Mailgun domain is in the EU region rather than the US region',
			},
			...emailSenderSettings,
		],
	},
	{
		option: { name: 'MSG91', value: 'msg91', description: 'Send SMS through MSG91' },
		settings: [
			{
				displayName: 'Auth Key',
				name: 'authKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The MSG91 auth key',
			},
			{
				displayName: 'Sender ID',
				name: 'senderId',
				type: 'string',
				default: '',
				description: 'The sender ID messages are sent from',
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				description: 'The ID of the MSG91 template messages are sent with',
			},
		],
	},
	{
		option: { name: 'Resend', value: 'resend', description: 'Send email through Resend' },
		settings: [apiKey('Resend'), ...emailSenderSettings],
	},
	{
		option: { name: 'SendGrid', value: 'sendgrid', description: 'Send email through SendGrid' },
		settings: [apiKey('SendGrid'), ...emailSenderSettings],
	},
	{
		option: { name: 'SMTP', value: 'smtp', description: 'Send email through any SMTP server' },
		settings: [
			{
				displayName: 'Auto TLS',
				name: 'autoTLS',
				type: 'boolean',
				default: true,
				description:
					'Whether to switch to TLS whenever the server supports it, even with Encryption set to None',
			},
			{
				displayName: 'Encryption',
				name: 'encryption',
				type: 'options',
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'SSL', value: 'ssl' },
					{ name: 'TLS', value: 'tls' },
				],
				default: 'none',
				description: 'The encryption to connect to the server with',
			},
			{
				displayName: 'Mailer',
				name: 'mailer',
				type: 'string',
				default: '',
				description: 'The value of the X-Mailer header on sent messages',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The password to sign in to the SMTP server with',
			},
			{
				displayName: 'Port',
				name: 'port',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 65535 },
				default: 587,
				description: 'The port of the SMTP server, for hosts that do not name their own',
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'The username to sign in to the SMTP server with',
			},
			...emailSenderSettings,
		],
		updateOnlySettings: [{ ...smtpHost, name: 'host' }],
	},
	{
		option: { name: 'Telesign', value: 'telesign', description: 'Send SMS through Telesign' },
		settings: [
			apiKey('Telesign'),
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				description: 'The Telesign customer ID',
			},
			senderNumber,
		],
	},
	{
		option: { name: 'Textmagic', value: 'textmagic', description: 'Send SMS through Textmagic' },
		settings: [
			apiKey('Textmagic'),
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'The Textmagic username',
			},
			senderNumber,
		],
	},
	{
		option: { name: 'Twilio', value: 'twilio', description: 'Send SMS through Twilio' },
		settings: [
			{
				displayName: 'Account SID',
				name: 'accountSid',
				type: 'string',
				default: '',
				description: 'The Twilio account SID',
			},
			{
				displayName: 'Auth Token',
				name: 'authToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The Twilio auth token',
			},
			{
				...senderNumber,
				description:
					'The phone number messages are sent from, with a leading + and the country code, or an alphanumeric sender ID',
			},
		],
	},
	{
		option: { name: 'Vonage', value: 'vonage', description: 'Send SMS through Vonage' },
		settings: [
			apiKey('Vonage'),
			{
				displayName: 'API Secret',
				name: 'apiSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The Vonage API secret',
			},
			senderNumber,
		],
	},
];

const byDisplayName = (a: INodeProperties, b: INodeProperties): number =>
	a.displayName.localeCompare(b.displayName);

/** Create's optional settings for one provider type. */
function createOptions(type: ProviderType): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['provider'],
				operation: ['create'],
				providerType: [type.option.value],
			},
		},
		options: [type.enabledOnCreate ?? enabledOnCreate, ...type.settings].sort(byDisplayName),
	};
}

/** Update's settings for one provider type: only the ones added are sent. */
function updateFields(type: ProviderType): INodeProperties {
	return {
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['provider'],
				operation: ['update'],
				providerType: [type.option.value],
			},
		},
		options: [...commonUpdateFields, ...type.settings, ...(type.updateOnlySettings ?? [])].sort(
			byDisplayName,
		),
	};
}

export const providerFields: INodeProperties[] = [
	providerLocator({
		resource: ['provider'],
		operation: ['delete', 'get', 'update'],
	}),
	{
		displayName: 'Provider Type',
		name: 'providerType',
		type: 'options',
		options: PROVIDER_TYPES.map((type) => type.option),
		default: 'smtp',
		description:
			"The service the provider sends through. When updating, this must match the provider's existing type.",
		displayOptions: {
			show: {
				resource: ['provider'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Transactional Email',
		description: 'The name of the provider',
		displayOptions: {
			show: {
				resource: ['provider'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Provider ID',
		name: 'providerId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the provider. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['provider'],
				operation: ['create'],
			},
		},
	},
	{
		...smtpHost,
		name: 'smtpHost',
		required: true,
		displayOptions: {
			show: {
				resource: ['provider'],
				operation: ['create'],
				providerType: ['smtp'],
			},
		},
	},
	...PROVIDER_TYPES.map(createOptions),
	...PROVIDER_TYPES.map(updateFields),
	...returnAllAndLimitProperties('provider', ['getMany']),
	...queriesProperties('provider', ['getMany'], {
		hint: 'Providers can be filtered on name, provider (e.g. sendgrid), type (email, sms, or push), and enabled',
	}),
	listOptionsProperty('provider', ['getMany']),
];
