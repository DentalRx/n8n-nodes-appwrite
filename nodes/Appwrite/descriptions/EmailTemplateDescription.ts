import type { INodeProperties } from 'n8n-workflow';

import { returnAllAndLimitProperties } from './shared';

export const emailTemplateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['emailTemplate'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve the subject, body, and sender of an email template',
				action: 'Get email template',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: "Retrieve a list of the project's customized email templates",
				action: 'Get many email templates',
			},
			{
				name: 'Update',
				value: 'update',
				description:
					'Customize the subject, body, or sender of an email template. Needs custom SMTP turned on.',
				action: 'Update email template',
			},
		],
		default: 'get',
	},
];

const show = (operations: string[]) => ({ resource: ['emailTemplate'], operation: operations });

export const emailTemplateFields: INodeProperties[] = [
	{
		displayName: 'Template',
		name: 'emailTemplateType',
		type: 'options',
		options: [
			{
				name: '2FA Verification',
				value: 'mfaChallenge',
				description: 'The code for a multi-factor authentication challenge',
			},
			{ name: 'Invite User', value: 'invitation', description: 'An invitation to join a team' },
			{ name: 'Magic URL', value: 'magicSession', description: 'A sign-in link' },
			{ name: 'OTP Session', value: 'otpSession', description: 'A sign-in code for email OTP' },
			{ name: 'Reset Password', value: 'recovery', description: 'A password reset link' },
			{
				name: 'Reset Password (OTP)',
				value: 'otpRecovery',
				description: 'A password reset code',
			},
			{
				name: 'Session Alert',
				value: 'sessionAlert',
				description: 'A notice that someone signed in to the account',
			},
			{
				name: 'Verification',
				value: 'verification',
				description: 'A link to verify an email address',
			},
			{
				name: 'Verification (OTP)',
				value: 'otpVerification',
				description: 'A code to verify an email address',
			},
		],
		default: 'verification',
		description: 'The email the template is for',
		displayOptions: { show: show(['get', 'update']) },
	},
	{
		displayName: 'Locale',
		name: 'emailTemplateLocale',
		type: 'string',
		default: '',
		placeholder: 'e.g. en',
		description:
			"The language version of the template, as a locale code such as en, de, or pt-br. Leave empty for Appwrite's default locale, usually en.",
		displayOptions: { show: show(['get', 'update']) },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description:
			'The parts of the template to change. Parts you do not add keep their current values; a customized template needs a subject and a message.',
		displayOptions: { show: show(['update']) },
		options: [
			{
				displayName: 'Message',
				name: 'templateMessage',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				description:
					'The body of the email, as plain text or HTML. It can use Appwrite\'s <a href="https://appwrite.io/docs/advanced/platform/message-templates">template variables</a>.',
			},
			{
				displayName: 'Reply-To Email',
				name: 'templateReplyToEmail',
				type: 'string',
				default: '',
				placeholder: 'e.g. support@example.com',
				description: 'The address replies to the email go to. Leave empty to clear it.',
			},
			{
				displayName: 'Reply-To Name',
				name: 'templateReplyToName',
				type: 'string',
				default: '',
				placeholder: 'e.g. Support Team',
				description: 'The name replies to the email are addressed to',
			},
			{
				displayName: 'Sender Email',
				name: 'templateSenderEmail',
				type: 'string',
				default: '',
				placeholder: 'e.g. noreply@example.com',
				description:
					'The address the email comes from, instead of the SMTP sender. Leave empty to clear it.',
			},
			{
				displayName: 'Sender Name',
				name: 'templateSenderName',
				type: 'string',
				default: '',
				placeholder: 'e.g. Example App',
				description: 'The name shown in the inbox as the sender of the email',
			},
			{
				displayName: 'Subject',
				name: 'templateSubject',
				type: 'string',
				default: '',
				description: 'The subject line of the email. Max length: 255 characters.',
			},
		],
	},
	...returnAllAndLimitProperties('emailTemplate', ['getMany']),
];
