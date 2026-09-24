import type { INodeProperties } from 'n8n-workflow';

import { functionLocator, proxyRuleLocator } from './locators';
import { queriesProperties, returnAllAndLimitProperties, simplifyProperty } from './shared';

export const proxyRuleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['proxyRule'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Connect a custom domain to the API, a function, or a site, or redirect it',
				action: 'Create proxy rule',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a proxy rule and disconnect its domain',
				action: 'Delete proxy rule',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single proxy rule by its ID',
				action: 'Get proxy rule',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List proxy rules, with optional filters',
				action: 'Get many proxy rules',
			},
			{
				name: 'Purge Cache',
				value: 'purgeCache',
				description: 'Remove cached content of a domain from the CDN',
				action: 'Purge domain cache',
			},
			{
				name: 'Verify Domain',
				value: 'verifyDomain',
				description:
					"Check the DNS records of a proxy rule's domain again, and issue its certificate once they are verified",
				action: 'Verify proxy rule domain',
			},
		],
		default: 'get',
	},
];

const createShow = (types: string[]) => ({
	resource: ['proxyRule'],
	operation: ['create'],
	proxyRuleType: types,
});

export const proxyRuleFields: INodeProperties[] = [
	proxyRuleLocator({
		resource: ['proxyRule'],
		operation: ['delete', 'get', 'verifyDomain'],
	}),
	{
		displayName: 'Rule Type',
		name: 'proxyRuleType',
		type: 'options',
		options: [
			{
				name: 'API',
				value: 'api',
				description: "Serve the project's Appwrite API on the domain",
			},
			{
				name: 'Function',
				value: 'function',
				description: 'Run a function on the domain',
			},
			{
				name: 'Redirect',
				value: 'redirect',
				description: 'Redirect the domain to another URL',
			},
			{
				name: 'Site',
				value: 'site',
				description: 'Serve a site on the domain',
			},
		],
		default: 'site',
		description: 'What the domain serves',
		displayOptions: {
			show: {
				resource: ['proxyRule'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. www.example.com',
		description:
			'The custom domain to connect. Appwrite checks its DNS records right away; if they are not in place yet, add them and run Verify Domain.',
		displayOptions: {
			show: {
				resource: ['proxyRule'],
				operation: ['create'],
			},
		},
	},
	{
		...functionLocator(createShow(['function'])),
		description: 'The function to run on the domain',
	},
	{
		displayName: 'Site ID',
		name: 'proxyRuleSiteId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
		description: 'The ID of the site to serve on the domain',
		displayOptions: { show: createShow(['site']) },
	},
	{
		displayName: 'Redirect URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com',
		description: 'The URL to send visitors to',
		displayOptions: { show: createShow(['redirect']) },
	},
	{
		displayName: 'Status Code',
		name: 'proxyRedirectStatusCode',
		type: 'options',
		options: [
			{ name: '301 Moved Permanently', value: '301' },
			{ name: '302 Found', value: '302' },
			{ name: '307 Temporary Redirect', value: '307' },
			{ name: '308 Permanent Redirect', value: '308' },
		],
		default: '301',
		description: 'The HTTP status code of the redirect',
		displayOptions: { show: createShow(['redirect']) },
	},
	{
		displayName: 'Belongs To',
		name: 'proxyRuleResourceType',
		type: 'options',
		options: [
			{ name: 'Function', value: 'function' },
			{ name: 'Site', value: 'site' },
		],
		default: 'site',
		description:
			'Whether the redirect belongs to a function or a site. The Console lists it on the Domains tab of that function or site.',
		displayOptions: { show: createShow(['redirect']) },
	},
	{
		...functionLocator({ ...createShow(['redirect']), proxyRuleResourceType: ['function'] }),
		description: 'The function the redirect belongs to',
	},
	{
		displayName: 'Site ID',
		name: 'proxyRuleSiteId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
		description: 'The ID of the site the redirect belongs to',
		displayOptions: {
			show: { ...createShow(['redirect']), proxyRuleResourceType: ['site'] },
		},
	},
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. www.example.com',
		description: 'The domain whose cached content to purge',
		displayOptions: {
			show: {
				resource: ['proxyRule'],
				operation: ['purgeCache'],
			},
		},
	},
	{
		displayName: 'Purge',
		name: 'proxyPurgeType',
		type: 'options',
		options: [
			{
				name: 'All Content',
				value: 'all',
				description: 'Everything cached for the domain',
			},
			{
				name: 'Cache Tag',
				value: 'tag',
				description: 'The responses labelled with one cache tag',
			},
			{
				name: 'Path',
				value: 'path',
				description: 'The cached response of one URL path',
			},
		],
		default: 'all',
		description: 'What to remove from the cache',
		displayOptions: {
			show: {
				resource: ['proxyRule'],
				operation: ['purgeCache'],
			},
		},
	},
	{
		displayName: 'Cache Tag',
		name: 'proxyPurgeReference',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. products',
		description: 'The cache tag to purge, up to 128 characters',
		displayOptions: {
			show: {
				resource: ['proxyRule'],
				operation: ['purgeCache'],
				proxyPurgeType: ['tag'],
			},
		},
	},
	{
		displayName: 'Path',
		name: 'proxyPurgeReference',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. /products/42',
		description: 'The URL path to purge, up to 2048 characters',
		displayOptions: {
			show: {
				resource: ['proxyRule'],
				operation: ['purgeCache'],
				proxyPurgeType: ['path'],
			},
		},
	},
	...returnAllAndLimitProperties('proxyRule', ['getMany']),
	...queriesProperties('proxyRule', ['getMany'], {
		hint: 'Filterable columns: domain, type, trigger, deploymentResourceType, deploymentResourceId, deploymentId, deploymentVcsProviderBranch',
	}),
	simplifyProperty('proxyRule', ['get', 'getMany']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: createShow(['function', 'site']) },
		options: [
			{
				displayName: 'Git Branch',
				name: 'proxyRuleBranch',
				type: 'string',
				default: '',
				placeholder: 'e.g. staging',
				description:
					'Serve the latest deployment of this Git branch, updated on every push. Leave empty to serve the active deployment.',
			},
		],
	},
];
