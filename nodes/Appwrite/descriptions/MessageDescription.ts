import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties } from './shared';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
		options: [
			{
				name: 'Create Email',
				value: 'createEmail',
				description: 'Create a new email message',
				action: 'Create an email message',
			},
			{
				name: 'Create Push',
				value: 'createPush',
				description: 'Create a new push notification',
				action: 'Create a push message',
			},
			{
				name: 'Create SMS',
				value: 'createSMS',
				description: 'Create a new SMS message',
				action: 'Create an SMS message',
			},
			{
				name: 'Delete',
				value: 'delete',
				description:
					'Delete a message. If the message has already been sent, this will not recall it.',
				action: 'Delete a message',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message by ID',
				action: 'Get a message',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List messages, with optional filters',
				action: 'Get many messages',
			},
			{
				name: 'Get Many Logs',
				value: 'getManyLogs',
				description: 'List the activity logs of a message',
				action: 'Get many message logs',
			},
			{
				name: 'Get Many Targets',
				value: 'getManyTargets',
				description: 'List the targets associated with a message',
				action: 'Get many message targets',
			},
			{
				name: 'Update Email',
				value: 'updateEmail',
				description: 'Update an email message that is in draft status',
				action: 'Update an email message',
			},
			{
				name: 'Update Push',
				value: 'updatePush',
				description: 'Update a push notification that is in draft status',
				action: 'Update a push message',
			},
			{
				name: 'Update SMS',
				value: 'updateSMS',
				description: 'Update an SMS message that is in draft status',
				action: 'Update an SMS message',
			},
		],
		default: 'get',
	},
];

const recipientProperties: INodeProperties[] = [
	{
		displayName: 'Topic IDs',
		name: 'topics',
		type: 'string',
		default: '',
		description:
			'Topic IDs to send the message to, as a comma-separated list or a JSON array. At least one of Topic IDs, User IDs, or Target IDs must be provided.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createEmail', 'createPush', 'createSMS'],
			},
		},
	},
	{
		displayName: 'User IDs',
		name: 'users',
		type: 'string',
		default: '',
		description:
			'User IDs to send the message to, as a comma-separated list or a JSON array. At least one of Topic IDs, User IDs, or Target IDs must be provided.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createEmail', 'createPush', 'createSMS'],
			},
		},
	},
	{
		displayName: 'Target IDs',
		name: 'targets',
		type: 'string',
		default: '',
		description:
			'Target IDs to send the message to, as a comma-separated list or a JSON array. At least one of Topic IDs, User IDs, or Target IDs must be provided.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createEmail', 'createPush', 'createSMS'],
			},
		},
	},
];

export const messageFields: INodeProperties[] = [
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the message',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: [
					'delete',
					'get',
					'getManyLogs',
					'getManyTargets',
					'updateEmail',
					'updatePush',
					'updateSMS',
				],
			},
		},
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the message. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createEmail', 'createPush', 'createSMS'],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		description: 'The subject of the email',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createEmail'],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		description: 'The content of the email',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createEmail'],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		default: '',
		description: 'The content of the SMS',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createSMS'],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'The title of the push notification',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createPush'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		default: '',
		description: 'The body of the push notification',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createPush'],
			},
		},
	},
	...recipientProperties,
	{
		displayName: 'Search',
		name: 'search',
		type: 'string',
		default: '',
		description: 'Search term to filter the message list',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getMany'],
			},
		},
	},
	...returnAllAndLimitProperties('message', ['getMany', 'getManyLogs', 'getManyTargets']),
	...queriesProperties('message', ['getMany', 'getManyLogs', 'getManyTargets'], {
		hint: 'Filter, sort, and paginate the results. For Get Many Logs, only Limit and Offset queries are supported.',
	}),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createEmail'],
			},
		},
		options: [
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'string',
				default: '',
				description:
					'File IDs to attach to the email, as a comma-separated list or a JSON array of compound IDs formatted as &lt;BUCKET_ID&gt;:&lt;FILE_ID&gt;',
			},
			{
				displayName: 'BCC',
				name: 'bcc',
				type: 'string',
				default: '',
				description: 'Target IDs to add as BCC, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				default: '',
				description: 'Target IDs to add as CC, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'Draft',
				name: 'draft',
				type: 'boolean',
				default: false,
				description: 'Whether to create the message as a draft instead of sending it immediately',
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'boolean',
				default: false,
				description: 'Whether the content is of type HTML',
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'string',
				default: '',
				placeholder: '2026-12-31T12:00:00.000Z',
				description:
					'Scheduled delivery time for the message, in ISO 8601 format. The value must be in the future.',
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
				resource: ['message'],
				operation: ['createPush'],
			},
		},
		options: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'string',
				default: '',
				description: 'Action for the push notification',
			},
			{
				displayName: 'Badge',
				name: 'badge',
				type: 'number',
				default: 0,
				description: 'Badge for the push notification. Available only on iOS.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '',
				description: 'Color for the push notification. Available only on Android.',
			},
			{
				displayName: 'Content Available',
				name: 'contentAvailable',
				type: 'boolean',
				default: false,
				description:
					'Whether to deliver the notification in the background. Available only on iOS.',
			},
			{
				displayName: 'Critical',
				name: 'critical',
				type: 'boolean',
				default: false,
				description:
					'Whether to mark the notification as critical. Requires the app to have the critical notification entitlement. Available only on iOS.',
			},
			{
				displayName: 'Data',
				name: 'data',
				type: 'json',
				default: '{}',
				description: 'Additional key-value pair data for the push notification, as a JSON object',
			},
			{
				displayName: 'Draft',
				name: 'draft',
				type: 'boolean',
				default: false,
				description: 'Whether to create the message as a draft instead of sending it immediately',
			},
			{
				displayName: 'Icon',
				name: 'icon',
				type: 'string',
				default: '',
				description: 'Icon for the push notification. Available only on Android and Web.',
			},
			{
				displayName: 'Image',
				name: 'image',
				type: 'string',
				default: '',
				description:
					'Image for the push notification. Must be a compound ID of a JPEG, PNG, or BMP image in Appwrite Storage, formatted as &lt;BUCKET_ID&gt;:&lt;FILE_ID&gt;.',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				options: [
					{
						name: 'High',
						value: 'high',
						description: 'Always attempt to immediately deliver the notification',
					},
					{
						name: 'Normal',
						value: 'normal',
						description:
							'Consider the device state, which may delay delivery of the notification',
					},
				],
				default: 'high',
				description: 'The delivery priority of the push notification',
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'string',
				default: '',
				placeholder: '2026-12-31T12:00:00.000Z',
				description:
					'Scheduled delivery time for the message, in ISO 8601 format. The value must be in the future.',
			},
			{
				displayName: 'Sound',
				name: 'sound',
				type: 'string',
				default: '',
				description: 'Sound for the push notification. Available only on Android and iOS.',
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				description: 'Tag for the push notification. Available only on Android.',
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
				resource: ['message'],
				operation: ['createSMS'],
			},
		},
		options: [
			{
				displayName: 'Draft',
				name: 'draft',
				type: 'boolean',
				default: false,
				description: 'Whether to create the message as a draft instead of sending it immediately',
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'string',
				default: '',
				placeholder: '2026-12-31T12:00:00.000Z',
				description:
					'Scheduled delivery time for the message, in ISO 8601 format. The value must be in the future.',
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
				resource: ['message'],
				operation: ['updateEmail'],
			},
		},
		options: [
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'string',
				default: '',
				description:
					'File IDs to attach to the email, as a comma-separated list or a JSON array of compound IDs formatted as &lt;BUCKET_ID&gt;:&lt;FILE_ID&gt;',
			},
			{
				displayName: 'BCC',
				name: 'bcc',
				type: 'string',
				default: '',
				description: 'Target IDs to add as BCC, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				default: '',
				description: 'Target IDs to add as CC, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'The content of the email',
			},
			{
				displayName: 'Draft',
				name: 'draft',
				type: 'boolean',
				default: false,
				description: 'Whether the message is a draft',
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'boolean',
				default: false,
				description: 'Whether the content is of type HTML',
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'string',
				default: '',
				placeholder: '2026-12-31T12:00:00.000Z',
				description:
					'Scheduled delivery time for the message, in ISO 8601 format. The value must be in the future.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The subject of the email',
			},
			{
				displayName: 'Target IDs',
				name: 'targets',
				type: 'string',
				default: '',
				description: 'Target IDs to send the message to, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'Topic IDs',
				name: 'topics',
				type: 'string',
				default: '',
				description: 'Topic IDs to send the message to, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'User IDs',
				name: 'users',
				type: 'string',
				default: '',
				description: 'User IDs to send the message to, as a comma-separated list or a JSON array',
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
				resource: ['message'],
				operation: ['updatePush'],
			},
		},
		options: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'string',
				default: '',
				description: 'Action for the push notification',
			},
			{
				displayName: 'Badge',
				name: 'badge',
				type: 'number',
				default: 0,
				description: 'Badge for the push notification. Available only on iOS.',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				description: 'The body of the push notification',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '',
				description: 'Color for the push notification. Available only on Android.',
			},
			{
				displayName: 'Content Available',
				name: 'contentAvailable',
				type: 'boolean',
				default: false,
				description:
					'Whether to deliver the notification in the background. Available only on iOS.',
			},
			{
				displayName: 'Critical',
				name: 'critical',
				type: 'boolean',
				default: false,
				description:
					'Whether to mark the notification as critical. Requires the app to have the critical notification entitlement. Available only on iOS.',
			},
			{
				displayName: 'Data',
				name: 'data',
				type: 'json',
				default: '{}',
				description: 'Additional key-value pair data for the push notification, as a JSON object',
			},
			{
				displayName: 'Draft',
				name: 'draft',
				type: 'boolean',
				default: false,
				description: 'Whether the message is a draft',
			},
			{
				displayName: 'Icon',
				name: 'icon',
				type: 'string',
				default: '',
				description: 'Icon for the push notification. Available only on Android and Web.',
			},
			{
				displayName: 'Image',
				name: 'image',
				type: 'string',
				default: '',
				description:
					'Image for the push notification. Must be a compound ID of a JPEG, PNG, or BMP image in Appwrite Storage, formatted as &lt;BUCKET_ID&gt;:&lt;FILE_ID&gt;.',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				options: [
					{
						name: 'High',
						value: 'high',
						description: 'Always attempt to immediately deliver the notification',
					},
					{
						name: 'Normal',
						value: 'normal',
						description:
							'Consider the device state, which may delay delivery of the notification',
					},
				],
				default: 'high',
				description: 'The delivery priority of the push notification',
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'string',
				default: '',
				placeholder: '2026-12-31T12:00:00.000Z',
				description:
					'Scheduled delivery time for the message, in ISO 8601 format. The value must be in the future.',
			},
			{
				displayName: 'Sound',
				name: 'sound',
				type: 'string',
				default: '',
				description: 'Sound for the push notification. Available only on Android and iOS.',
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				description: 'Tag for the push notification. Available only on Android.',
			},
			{
				displayName: 'Target IDs',
				name: 'targets',
				type: 'string',
				default: '',
				description: 'Target IDs to send the message to, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title of the push notification',
			},
			{
				displayName: 'Topic IDs',
				name: 'topics',
				type: 'string',
				default: '',
				description: 'Topic IDs to send the message to, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'User IDs',
				name: 'users',
				type: 'string',
				default: '',
				description: 'User IDs to send the message to, as a comma-separated list or a JSON array',
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
				resource: ['message'],
				operation: ['updateSMS'],
			},
		},
		options: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content of the SMS',
			},
			{
				displayName: 'Draft',
				name: 'draft',
				type: 'boolean',
				default: false,
				description: 'Whether the message is a draft',
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'string',
				default: '',
				placeholder: '2026-12-31T12:00:00.000Z',
				description:
					'Scheduled delivery time for the message, in ISO 8601 format. The value must be in the future.',
			},
			{
				displayName: 'Target IDs',
				name: 'targets',
				type: 'string',
				default: '',
				description: 'Target IDs to send the message to, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'Topic IDs',
				name: 'topics',
				type: 'string',
				default: '',
				description: 'Topic IDs to send the message to, as a comma-separated list or a JSON array',
			},
			{
				displayName: 'User IDs',
				name: 'users',
				type: 'string',
				default: '',
				description: 'User IDs to send the message to, as a comma-separated list or a JSON array',
			},
		],
	},
];
