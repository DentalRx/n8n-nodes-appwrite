import type { INodeProperties } from 'n8n-workflow';

/**
 * The project's auth security policies (Auth > Security in the Console), each
 * with exactly the settings its endpoint (`PATCH /project/policies/<policy>`)
 * accepts. Project → Update Policy shows the chosen policy's required
 * settings on the node's face and its optional ones in an Update Fields
 * collection; the operation sends each under its body key.
 */

/** One setting of a policy: the node parameter and the body key it fills. */
export interface ProjectPolicyField {
	/** The key Appwrite expects in the request body. */
	body: string;
	property: INodeProperties;
	/** Converts the parameter's value to what Appwrite expects, when they differ. */
	toBody?: (value: unknown) => unknown;
}

export interface ProjectPolicy {
	/** The policy ID Appwrite uses in paths, e.g. `password-history`. */
	value: string;
	/** The policy's name in the Console. */
	name: string;
	description: string;
	/** Settings the endpoint requires, shown on the node's face. */
	required: ProjectPolicyField[];
	/** Settings the endpoint keeps when left out, offered in an Update Fields collection. */
	optional: ProjectPolicyField[];
}

function toggle(
	name: string,
	body: string,
	displayName: string,
	description: string,
): ProjectPolicyField {
	return { body, property: { displayName, name, type: 'boolean', default: true, description } };
}

function count(
	name: string,
	body: string,
	displayName: string,
	[minValue, maxValue, defaultValue]: [number, number, number],
	description: string,
): ProjectPolicyField {
	return {
		body,
		property: {
			displayName,
			name,
			type: 'number',
			typeOptions: { minValue, maxValue },
			default: defaultValue,
			description,
		},
	};
}

/** A policy that is only switched on or off. */
function onOff(
	value: string,
	name: string,
	description: string,
	enabledDescription: string,
): ProjectPolicy {
	return {
		value,
		name,
		description,
		required: [toggle('enabled', 'enabled', 'Enabled', enabledDescription)],
		optional: [],
	};
}

const EMAIL_CHANGE = 'when users sign up or change their email';

export const PROJECT_POLICIES: ProjectPolicy[] = [
	{
		value: 'password-pwned',
		name: 'Breached Passwords',
		description: 'Check passwords against the Have I Been Pwned database of breached passwords',
		required: [],
		optional: [
			toggle(
				'enabled',
				'enabled',
				'Check Passwords',
				'Whether to check passwords against known data breaches when users sign up, sign in, or reset them, and record the result on the user. On its own this only records. Only the first five characters of each password hash leave Appwrite.',
			),
			toggle(
				'blockBreachedSignIn',
				'sessions',
				'Block Sign-In',
				'Whether to refuse a sign-in with a breached password until the user resets it',
			),
			toggle(
				'rejectBreachedPasswords',
				'users',
				'Reject New Passwords',
				'Whether to reject a breached password when a user signs up or sets a new password',
			),
		],
	},
	onOff(
		'deny-aliased-email',
		'Deny Aliased Emails',
		'Block email addresses with aliases, such as user+tag@gmail.com',
		`Whether to block email addresses with aliases, tags, or subaddresses, such as user+folder1@gmail.com, ${EMAIL_CHANGE}`,
	),
	onOff(
		'deny-disposable-email',
		'Deny Disposable Emails',
		'Block temporary and disposable email providers',
		`Whether to block temporary and disposable email providers, such as Mailinator, ${EMAIL_CHANGE}`,
	),
	onOff(
		'deny-free-email',
		'Deny Free Emails',
		'Block free email providers such as Gmail or Yahoo',
		`Whether to block free email providers, such as Gmail or Yahoo, ${EMAIL_CHANGE}`,
	),
	onOff(
		'deny-corporate-email',
		'Deny Non-Corporate Emails',
		'Allow only corporate email addresses',
		`Whether to allow only corporate email addresses, blocking free and disposable email providers, ${EMAIL_CHANGE}`,
	),
	onOff(
		'password-personal-data',
		'Disallow Personal Data',
		"Reject passwords that contain the user's personal data",
		"Whether to reject passwords that contain the user's name, email, phone number, or ID. Existing passwords stay valid.",
	),
	onOff(
		'session-invalidation',
		'Invalidate Sessions',
		'Sign users out everywhere when their password changes',
		"Whether to end all of a user's sessions when their password changes",
	),
	{
		value: 'membership-privacy',
		name: 'Memberships Privacy',
		description: 'Choose what team members can see about each other',
		required: [],
		optional: [
			toggle(
				'showUserAccessedAt',
				'userAccessedAt',
				'Last Access Time',
				'Whether team members can see when the other members last used the project',
			),
			toggle(
				'showUserEmail',
				'userEmail',
				'Email',
				"Whether team members can see each other's email addresses",
			),
			toggle(
				'showUserMfa',
				'userMFA',
				'MFA Status',
				'Whether team members can see which members have multi-factor authentication turned on',
			),
			toggle('showUserName', 'userName', 'Name', "Whether team members can see each other's names"),
			toggle(
				'showUserPhone',
				'userPhone',
				'Phone',
				"Whether team members can see each other's phone numbers",
			),
			toggle(
				'showUserId',
				'userId',
				'User ID',
				"Whether team members can see each other's user IDs",
			),
		],
	},
	{
		value: 'mfa-factors',
		name: 'MFA Factors',
		description:
			'Choose how users can complete a multi-factor authentication challenge. Recovery codes always work.',
		required: [],
		optional: [
			toggle(
				'mfaCustom',
				'custom',
				'Custom',
				'Whether users can complete MFA with codes Appwrite generates and you deliver through your own channel',
			),
			toggle(
				'mfaEmail',
				'email',
				'Email',
				'Whether users can complete MFA with codes sent to their verified email address',
			),
			toggle(
				'mfaPhone',
				'phone',
				'Phone',
				'Whether users can complete MFA with codes sent by SMS to their verified phone number',
			),
			toggle(
				'mfaTotp',
				'totp',
				'TOTP',
				'Whether users can complete MFA with time-based codes from an authenticator app',
			),
		],
	},
	onOff(
		'password-dictionary',
		'Password Dictionary',
		'Reject the 10,000 most common passwords',
		'Whether to reject new passwords that are among the 10,000 most common passwords. Existing passwords stay valid.',
	),
	{
		value: 'password-history',
		name: 'Password History',
		description: 'Stop users from reusing their recent passwords',
		required: [
			{
				...count(
					'passwordHistoryLength',
					'total',
					'History Length',
					[0, 20, 5],
					"How many of a user's previous passwords they cannot reuse, from 1 to 20. Set to 0 to turn the policy off.",
				),
				// Appwrite turns the policy off with null; 0 is outside its range.
				toBody: (value) => (value === 0 ? null : value),
			},
		],
		optional: [],
	},
	{
		value: 'password-strength',
		name: 'Password Strength',
		description: 'Set the minimum length and the characters new passwords need',
		required: [],
		optional: [
			count(
				'passwordMinLength',
				'min',
				'Minimum Length',
				[8, 256, 8],
				'The minimum number of characters in a password, from 8 to 256',
			),
			toggle(
				'requireLowercase',
				'lowercase',
				'Require Lowercase Letter',
				'Whether passwords must include at least one lowercase letter',
			),
			toggle(
				'requireNumber',
				'number',
				'Require Number',
				'Whether passwords must include at least one number',
			),
			toggle(
				'requireSymbol',
				'symbols',
				'Require Special Character',
				'Whether passwords must include at least one special character',
			),
			toggle(
				'requireUppercase',
				'uppercase',
				'Require Uppercase Letter',
				'Whether passwords must include at least one uppercase letter',
			),
		],
	},
	onOff(
		'session-alert',
		'Session Alerts',
		'Email users when a new session is created for their account',
		'Whether to email users when a new session is created for their account. The first session after signing up sends no alert.',
	),
	{
		value: 'session-duration',
		name: 'Session Length',
		description: 'Set how long sessions stay active',
		required: [
			count(
				'sessionLength',
				'duration',
				'Session Length (Seconds)',
				[60, 31536000, 31536000],
				'How long a session stays active, in seconds, from 60 up to one year (31536000). Shortening it signs out users whose sessions are older.',
			),
		],
		optional: [],
	},
	{
		value: 'session-limit',
		name: 'Sessions Limit',
		description: 'Limit how many active sessions each user can have',
		required: [
			count(
				'sessionsLimit',
				'total',
				'Sessions Limit',
				[1, 100, 10],
				"The most active sessions a user can have, from 1 to 100. Going over it deletes the user's oldest session.",
			),
		],
		optional: [],
	},
	{
		value: 'user-limit',
		name: 'Users Limit',
		description: 'Limit how many users the project can have',
		required: [
			count(
				'usersLimit',
				'total',
				'Users Limit',
				[0, 10000, 0],
				'The most users the project can have, up to 10000. Set to 0 for no limit. Once it is reached, new sign-ups are refused, but existing users stay active.',
			),
		],
		optional: [],
	},
];

/** The Project → Get Policy / Update Policy parameters, generated from the table above. */
export function policyProperties(resource: string): INodeProperties[] {
	const show = (policy: ProjectPolicy) => ({
		resource: [resource],
		operation: ['updatePolicy'],
		projectPolicy: [policy.value],
	});
	return [
		{
			displayName: 'Policy',
			name: 'projectPolicy',
			type: 'options',
			noDataExpression: true,
			options: [...PROJECT_POLICIES]
				.sort((a, b) => a.name.localeCompare(b.name))
				.map((policy) => ({
					name: policy.name,
					value: policy.value,
					description: policy.description,
				})),
			default: 'password-strength',
			description: 'The security policy to use',
			displayOptions: {
				show: { resource: [resource], operation: ['getPolicy', 'updatePolicy'] },
			},
		},
		...PROJECT_POLICIES.flatMap((policy) =>
			policy.required.map((field): INodeProperties => ({
				...field.property,
				...(field.property.type === 'boolean' ? {} : { required: true }),
				displayOptions: { show: show(policy) },
			})),
		),
		...PROJECT_POLICIES.filter((policy) => policy.optional.length > 0).map(
			(policy): INodeProperties => ({
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add field',
				default: {},
				displayOptions: { show: show(policy) },
				options: policy.optional
					.map((field) => field.property)
					.sort((a, b) => a.displayName.localeCompare(b.displayName)),
			}),
		),
	];
}
