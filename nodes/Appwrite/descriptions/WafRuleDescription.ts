import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { functionLocator, wafRuleLocator } from './locators';
import {
	listOptionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	simplifyProperty,
} from './shared';

/**
 * Firewall rules (Appwrite's WAF). Each action has its own create and update
 * endpoint with its own settings, so the settings are declared once in the
 * WAF_RULE_TYPES table below: the node's fields for every type are generated
 * from it, and the operations module builds each request body from the same
 * table, so a type can only ever send the settings its endpoint accepts.
 */

/** One request setting: the body key Appwrite expects and the parameter that collects it. */
export interface WafRuleSetting {
	key: string;
	property: INodeProperties;
}

export interface WafRuleType {
	option: INodePropertyOptions & { value: string };
	/** The endpoint segment: `/waf/rules/<path>`. */
	path: string;
	/** Settings the create endpoint requires, shown on the node's face. */
	required: WafRuleSetting[];
	/** Optional settings of the create endpoint beyond the ones every type takes. */
	createOptions: WafRuleSetting[];
	/** Settings of the update endpoint beyond the ones every type takes. */
	updateFields: WafRuleSetting[];
}

const requestLimit: WafRuleSetting = {
	key: 'limit',
	property: {
		displayName: 'Request Limit',
		name: 'wafRequestLimit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 1000000 },
		default: 100,
		description: 'How many matching requests each client may send per interval',
	},
};

const interval: WafRuleSetting = {
	key: 'interval',
	property: {
		displayName: 'Interval (Seconds)',
		name: 'wafInterval',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 86400 },
		default: 60,
		description: 'The length of the window the request limit applies to, in seconds',
	},
};

const limitBy: WafRuleSetting = {
	key: 'key',
	property: {
		displayName: 'Limit By',
		name: 'wafRateLimitKey',
		type: 'options',
		options: [
			{
				name: 'IP Address',
				value: 'ip',
				description: 'Count requests per client IP address',
			},
			{
				name: 'User ID',
				value: 'userId',
				description:
					'Count requests per signed-in user. Requests without a signed-in user skip the rule.',
			},
		],
		default: 'ip',
		description: 'What counts as one client',
	},
};

const strategy: WafRuleSetting = {
	key: 'strategy',
	property: {
		displayName: 'Strategy',
		name: 'wafRateLimitStrategy',
		type: 'options',
		options: [
			{
				name: 'Fixed Window',
				value: 'fixedWindow',
				description:
					'Count requests in back-to-back windows. Short bursts can get through at window boundaries.',
			},
			{
				name: 'Sliding Window',
				value: 'slidingWindow',
				description:
					"Fade out the previous window's count instead of resetting it, for an even rate",
			},
			{
				name: 'Token Bucket',
				value: 'tokenBucket',
				description: 'Refill the allowance continuously, allowing bursts up to Max Bucket Size',
			},
		],
		default: 'fixedWindow',
		description:
			'How the quota is enforced over time. It cannot be changed after the rule is created.',
	},
};

const maxBucketSize: WafRuleSetting = {
	key: 'maxBucketSize',
	property: {
		displayName: 'Max Bucket Size',
		name: 'wafMaxBucketSize',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 1000000 },
		default: 50,
		description:
			'The largest burst the Token Bucket strategy allows. Other strategies ignore it. Left out, Appwrite uses the request limit.',
	},
};

const difficulty: WafRuleSetting = {
	key: 'difficulty',
	property: {
		displayName: 'Difficulty',
		name: 'wafChallengeDifficulty',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 5 },
		default: 3,
		description:
			"How much proof-of-work the visitor's browser must do, from 1 (easiest) to 5 (hardest)",
	},
};

const ttl: WafRuleSetting = {
	key: 'ttl',
	property: {
		displayName: 'TTL (Seconds)',
		name: 'wafChallengeTtl',
		type: 'number',
		typeOptions: { minValue: 900, maxValue: 86400 },
		default: 1800,
		description: 'How long a visitor stays cleared after passing the challenge, in seconds',
	},
};

const location: WafRuleSetting = {
	key: 'location',
	property: {
		displayName: 'Redirect Location',
		name: 'wafRedirectLocation',
		type: 'string',
		default: '',
		placeholder: 'e.g. /maintenance',
		description: 'Where to send matching visitors: a full URL or a path',
	},
};

const statusCode: WafRuleSetting = {
	key: 'statusCode',
	property: {
		displayName: 'Status Code',
		name: 'wafRedirectStatusCode',
		type: 'options',
		options: [
			{ name: '301 Moved Permanently', value: 301 },
			{ name: '302 Found', value: 302 },
			{ name: '303 See Other', value: 303 },
			{ name: '307 Temporary Redirect', value: 307 },
			{ name: '308 Permanent Redirect', value: 308 },
		],
		default: 302,
		description: 'The HTTP status code of the redirect',
	},
};

/**
 * Every rule action, with the settings its endpoints take beyond the common
 * ones. The challenge endpoints also take a challenge type, whose only value
 * is the default proof-of-work (`compute`), so the node does not ask for it.
 */
export const WAF_RULE_TYPES: WafRuleType[] = [
	{
		option: {
			name: 'Bypass',
			value: 'bypass',
			description: 'Let matching requests through and skip the rules after this one',
		},
		path: 'bypass',
		required: [],
		createOptions: [],
		updateFields: [],
	},
	{
		option: {
			name: 'Challenge',
			value: 'challenge',
			description: "Make the visitor's browser solve a proof-of-work puzzle before continuing",
		},
		path: 'challenge',
		required: [],
		createOptions: [difficulty, ttl],
		updateFields: [difficulty, ttl],
	},
	{
		option: {
			name: 'Deny',
			value: 'deny',
			description: 'Reject matching requests with a 403 response',
		},
		path: 'deny',
		required: [],
		createOptions: [],
		updateFields: [],
	},
	{
		option: {
			name: 'Rate Limit',
			value: 'rateLimit',
			description: 'Reject requests over a quota with a 429 response',
		},
		path: 'rate-limit',
		required: [requestLimit, interval],
		createOptions: [limitBy, maxBucketSize, strategy],
		updateFields: [interval, limitBy, maxBucketSize, requestLimit],
	},
	{
		option: {
			name: 'Redirect',
			value: 'redirect',
			description: 'Send matching requests to another location',
		},
		path: 'redirect',
		required: [location, statusCode],
		createOptions: [],
		updateFields: [location, statusCode],
	},
];

const resourceTypeOptions: INodePropertyOptions[] = [
	{
		name: 'API',
		value: 'api',
		description: "Traffic to the project's Appwrite API",
	},
	{
		name: 'Function',
		value: 'functions',
		description: 'Public traffic to one function',
	},
	{
		name: 'Site',
		value: 'sites',
		description: 'Public traffic to one site',
	},
];

/** Optional settings every rule type takes, on create and on update. */
export const WAF_COMMON_OPTIONS: WafRuleSetting[] = [
	{
		key: 'description',
		property: {
			displayName: 'Description',
			name: 'description',
			type: 'string',
			typeOptions: { rows: 2 },
			default: '',
			description: 'Notes about the rule for your team, up to 1024 characters',
		},
	},
	{
		key: 'enabled',
		property: {
			displayName: 'Enabled',
			name: 'enabled',
			type: 'boolean',
			default: true,
			description:
				'Whether the rule is evaluated. A disabled rule is kept and still counts toward the plan limit.',
		},
	},
	{
		key: 'priority',
		property: {
			displayName: 'Priority',
			name: 'wafPriority',
			type: 'number',
			typeOptions: { minValue: -100000, maxValue: 100000 },
			default: 0,
			description:
				'Where the rule runs in the evaluation order, from -100000 to 100000. Lower numbers run first, and the first matching enabled rule decides what happens to a request.',
		},
	},
];

/** Settings create asks for on the node's face, which update takes as optional fields. */
export const WAF_COMMON_UPDATE_FIELDS: WafRuleSetting[] = [
	{
		key: 'name',
		property: {
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			description: 'The name of the rule, up to 128 characters',
		},
	},
	{
		key: 'resourceType',
		property: {
			displayName: 'Resource Type',
			name: 'wafResourceType',
			type: 'options',
			options: resourceTypeOptions,
			default: 'api',
			description: 'Which traffic the rule applies to. Set Resource ID too for a function or site.',
		},
	},
	{
		key: 'resourceId',
		property: {
			displayName: 'Resource ID',
			name: 'wafResourceId',
			type: 'string',
			default: '',
			placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
			description:
				'The ID of the function or site the rule applies to. Leave empty for the API resource type.',
		},
	},
];

/**
 * The attributes a condition can compare, as the Console labels them. Header
 * and Query Parameter compare one named header or parameter; the rest need
 * nothing else. Premium attributes need the Geo DB addon.
 */
const PREMIUM = 'Requires the premium Geo DB addon';
const CONDITION_ATTRIBUTES: INodePropertyOptions[] = [
	{
		name: 'Accept',
		value: 'accept',
		description: 'The raw Accept header (functions and sites only)',
	},
	{
		name: 'Accept-Language',
		value: 'acceptLanguage',
		description: 'The raw Accept-Language header (functions and sites only)',
	},
	{ name: 'AS Number', value: 'autonomousSystemNumber', description: PREMIUM },
	{ name: 'AS Organization', value: 'autonomousSystemOrganization', description: PREMIUM },
	{ name: 'Browser', value: 'browser', description: 'The browser, derived from the user agent' },
	{ name: 'City', value: 'city', description: PREMIUM },
	{ name: 'Connection Organization', value: 'connectionOrganization', description: PREMIUM },
	{ name: 'Connection Type', value: 'connectionType', description: PREMIUM },
	{ name: 'Connection Usage Type', value: 'connectionUsageType', description: PREMIUM },
	{ name: 'Continent', value: 'continent', description: 'The continent code, e.g. EU' },
	{
		name: 'Cookie',
		value: 'cookie',
		description: 'The raw Cookie header (functions and sites only)',
	},
	{ name: 'Country', value: 'country', description: 'The ISO country code, e.g. US' },
	{ name: 'Header', value: 'headers', description: 'One named request header' },
	{ name: 'Hostname', value: 'host', description: 'The host serving the request' },
	{
		name: 'IP Address',
		value: 'ip',
		description: 'The client IP address. Equals and Not Equal also accept CIDR blocks.',
	},
	{ name: 'ISP', value: 'isp', description: PREMIUM },
	{ name: 'Latitude', value: 'latitude', description: PREMIUM },
	{ name: 'Longitude', value: 'longitude', description: PREMIUM },
	{ name: 'Method', value: 'method', description: 'The HTTP method in upper case, e.g. POST' },
	{
		name: 'Operating System',
		value: 'os',
		description: 'The operating system, derived from the user agent',
	},
	{ name: 'Path', value: 'path', description: 'The URL path, without the query string' },
	{ name: 'Postal Code', value: 'postalCode', description: PREMIUM },
	{ name: 'Protocol', value: 'protocol', description: 'HTTP or HTTPS' },
	{ name: 'Query Parameter', value: 'query', description: 'One named query string parameter' },
	{
		name: 'Query Parameter Name',
		value: 'queryKeys',
		description: 'The names of the query string parameters present',
	},
	{ name: 'State', value: 'state', description: PREMIUM },
	{ name: 'Time Zone', value: 'timeZone', description: PREMIUM },
	{ name: 'User Agent', value: 'userAgent', description: 'The raw User-Agent header' },
	{ name: 'Weather Code', value: 'weatherCode', description: PREMIUM },
];

/** Operators that compare with no value. */
export const WAF_VALUELESS_OPERATORS = ['isNotNull', 'isNull'];

/** Operators that match when the attribute matches any one of several values. */
export const WAF_MULTI_VALUE_OPERATORS = ['contains', 'equal', 'notContains', 'notEqual'];

/** Operators that compare with a lower and an upper bound. */
export const WAF_RANGE_OPERATORS = ['between', 'notBetween'];

/** The condition builder, on the node's face for create and inside Update Fields for update. */
function conditionsProperty(description: string): INodeProperties {
	return {
		displayName: 'Conditions',
		name: 'wafConditionsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Condition',
		default: {},
		description,
		options: [
			{
				name: 'conditionValues',
				displayName: 'Condition',
				values: [
					{
						displayName: 'Attribute',
						name: 'wafConditionAttribute',
						type: 'options',
						options: CONDITION_ATTRIBUTES,
						default: 'path',
						description: 'The part of the request to compare',
					},
					{
						displayName: 'Header or Parameter Name',
						name: 'wafConditionKey',
						type: 'string',
						default: '',
						placeholder: 'e.g. x-api-client',
						description:
							'The name of the header or query parameter to compare. Appwrite only matches lowercase names, so the node lowercases it.',
						displayOptions: { show: { wafConditionAttribute: ['headers', 'query'] } },
					},
					{
						displayName: 'Operator',
						name: 'wafConditionOperator',
						type: 'options',
						options: [
							{
								name: 'Contains',
								value: 'contains',
								description: 'Contains any of the values as a substring',
							},
							{
								name: 'Does Not Contain',
								value: 'notContains',
								description: 'Contains none of the values',
							},
							{ name: 'Does Not End With', value: 'notEndsWith' },
							{ name: 'Does Not Start With', value: 'notStartsWith' },
							{ name: 'Ends With', value: 'endsWith' },
							{ name: 'Equals', value: 'equal', description: 'Equals any of the values' },
							{ name: 'Greater Than', value: 'greaterThan' },
							{ name: 'Greater Than or Equal', value: 'greaterThanEqual' },
							{
								name: 'Is Between',
								value: 'between',
								description: 'Lies between the two values, inclusive',
							},
							{ name: 'Is Empty', value: 'isNull', description: 'The request did not send it' },
							{
								name: 'Is Not Between',
								value: 'notBetween',
								description: 'Lies outside the two values',
							},
							{ name: 'Is Not Empty', value: 'isNotNull', description: 'The request sent it' },
							{ name: 'Less Than', value: 'lessThan' },
							{ name: 'Less Than or Equal', value: 'lessThanEqual' },
							{ name: 'Not Equal', value: 'notEqual', description: 'Equals none of the values' },
							{ name: 'Starts With', value: 'startsWith' },
						],
						default: 'equal',
						description:
							'How to compare the attribute with the value. Text comparison ignores case.',
					},
					{
						displayName: 'Value',
						name: 'wafConditionValue',
						type: 'string',
						typeOptions: { rows: 2 },
						default: '',
						placeholder: 'e.g. /v1/account',
						description:
							'The value to compare the attribute with. Equals, Not Equal, Contains and Does Not Contain take several values, one per line. Is Between and Is Not Between take the lower and upper bound on two lines.',
						displayOptions: { hide: { wafConditionOperator: WAF_VALUELESS_OPERATORS } },
					},
				],
			},
		],
	};
}

const byDisplayName = (a: INodeProperties, b: INodeProperties): number =>
	a.displayName.localeCompare(b.displayName);

export const wafRuleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['wafRule'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new firewall rule that acts on matching requests',
				action: 'Create firewall rule',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a firewall rule permanently',
				action: 'Delete firewall rule',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single firewall rule by its ID',
				action: 'Get firewall rule',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List firewall rules, with optional filters',
				action: 'Get many firewall rules',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the settings or conditions of a firewall rule',
				action: 'Update firewall rule',
			},
		],
		default: 'get',
	},
];

export const wafRuleFields: INodeProperties[] = [
	wafRuleLocator({
		resource: ['wafRule'],
		operation: ['delete', 'get', 'update'],
	}),
	{
		displayName: 'Action',
		name: 'wafRuleType',
		type: 'options',
		options: WAF_RULE_TYPES.map((type) => type.option),
		default: 'deny',
		description:
			'What the rule does with matching requests. A rule keeps the action it was created with, so on update choose that action.',
		displayOptions: {
			show: {
				resource: ['wafRule'],
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
		placeholder: 'e.g. Block admin paths',
		description: 'The name of the rule, shown in the Firewall rules list. Up to 128 characters.',
		displayOptions: {
			show: {
				resource: ['wafRule'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Rule ID',
		name: 'wafRuleId',
		type: 'string',
		default: '',
		description:
			'The ID for the rule. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['wafRule'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Resource Type',
		name: 'wafResourceType',
		type: 'options',
		options: resourceTypeOptions,
		default: 'api',
		description: 'Which traffic the rule applies to',
		displayOptions: {
			show: {
				resource: ['wafRule'],
				operation: ['create'],
			},
		},
	},
	{
		...functionLocator({
			resource: ['wafRule'],
			operation: ['create'],
			wafResourceType: ['functions'],
		}),
		description: 'The function whose public traffic the rule applies to',
	},
	{
		displayName: 'Site ID',
		name: 'wafRuleSiteId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
		description: 'The ID of the site whose public traffic the rule applies to',
		displayOptions: {
			show: {
				resource: ['wafRule'],
				operation: ['create'],
				wafResourceType: ['sites'],
			},
		},
	},
	{
		...conditionsProperty(
			'The requests the rule applies to. A request must match every condition, and a rule without conditions matches no request.',
		),
		displayOptions: {
			show: {
				resource: ['wafRule'],
				operation: ['create'],
			},
		},
	},
	// The settings each action requires, on the node's face.
	...WAF_RULE_TYPES.flatMap((type) =>
		type.required.map((setting): INodeProperties => ({
			...setting.property,
			required: true,
			displayOptions: {
				show: {
					resource: ['wafRule'],
					operation: ['create'],
					wafRuleType: [type.option.value],
				},
			},
		})),
	),
	...returnAllAndLimitProperties('wafRule', ['getMany']),
	...queriesProperties('wafRule', ['getMany']),
	simplifyProperty('wafRule', ['get', 'getMany']),
	// One Options collection per action, listing exactly the settings it takes.
	...WAF_RULE_TYPES.map((type): INodeProperties => ({
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['wafRule'],
				operation: ['create'],
				wafRuleType: [type.option.value],
			},
		},
		options: [...WAF_COMMON_OPTIONS, ...type.createOptions]
			.map((setting) => setting.property)
			.sort(byDisplayName),
	})),
	...WAF_RULE_TYPES.map((type): INodeProperties => ({
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['wafRule'],
				operation: ['update'],
				wafRuleType: [type.option.value],
			},
		},
		options: [
			conditionsProperty(
				"Replaces the rule's conditions. A request must match every condition. Leave this field out to keep the current conditions.",
			),
			...[...WAF_COMMON_OPTIONS, ...WAF_COMMON_UPDATE_FIELDS, ...type.updateFields].map(
				(setting) => setting.property,
			),
		].sort(byDisplayName),
	})),
	listOptionsProperty('wafRule', ['getMany']),
];
