import type { IDisplayOptions, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { resourceLocator } from './locators';
import {
	listOptionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	simplifyProperty,
} from './shared';

/**
 * The domains of the organization the Appwrite Organization API credential
 * belongs to (Appwrite Cloud), with the DNS records Appwrite hosts for them.
 */

export const domainOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['domain'],
			},
		},
		options: [
			{
				name: 'Add Preset',
				value: 'createPreset',
				description:
					'Add the DNS records an email provider, such as Google Workspace or Zoho Mail, needs to the domain',
				action: 'Add domain preset',
			},
			{
				name: 'Change Organization',
				value: 'updateTeam',
				description: 'Move the domain and all its DNS records to another organization',
				action: 'Change domain organization',
			},
			{
				name: 'Check Availability',
				value: 'listPrices',
				description:
					'Check whether domain names can be registered, and at what price. It only looks prices up: nothing is bought or charged.',
				action: 'Check domain availability',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Add a domain registered elsewhere to the organization, to host its DNS',
				action: 'Create domain',
			},
			{
				name: 'Create Record',
				value: 'createRecord',
				description: 'Add a DNS record, such as an A, CNAME, MX, or TXT record, to the domain',
				action: 'Create DNS record',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete the domain and all its DNS records from the organization permanently',
				action: 'Delete domain',
			},
			{
				name: 'Delete Record',
				value: 'deleteRecord',
				description: 'Delete a DNS record from the domain permanently',
				action: 'Delete DNS record',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a domain, including its registration and renewal details',
				action: 'Get domain',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: "Retrieve a list of the organization's domains",
				action: 'Get many domains',
			},
			{
				name: 'Get Many Records',
				value: 'getManyRecords',
				description: "Retrieve a list of the domain's DNS records",
				action: 'Get many DNS records',
			},
			{
				name: 'Get Preset',
				value: 'getPreset',
				description:
					'Preview the DNS records an email provider preset would add, without adding them',
				action: 'Get domain preset',
			},
			{
				name: 'Get Record',
				value: 'getRecord',
				description: 'Retrieve a DNS record of the domain',
				action: 'Get DNS record',
			},
			{
				name: 'Get Transfer Status',
				value: 'getTransferStatus',
				description: 'Check the progress of a transfer of the domain to Appwrite',
				action: 'Get domain transfer status',
			},
			{
				name: 'Get Zone File',
				value: 'getZone',
				description: "Export the domain's DNS records as a zone file",
				action: 'Get domain zone file',
			},
			{
				name: 'Import Zone File',
				value: 'updateZone',
				description: 'Import the DNS records of a zone file into the domain',
				action: 'Import domain zone file',
			},
			{
				name: 'Update Nameservers',
				value: 'updateNameservers',
				description:
					'Change the nameservers the registrar lists for a domain registered through Appwrite',
				action: 'Update domain nameservers',
			},
			{
				name: 'Update Record',
				value: 'updateRecord',
				description: "Change a DNS record's name, value, TTL, or comment",
				action: 'Update DNS record',
			},
			{
				name: 'Verify Nameservers',
				value: 'verifyNameservers',
				description:
					"Check whether the domain's nameservers point to Appwrite, and update its status",
				action: 'Verify domain nameservers',
			},
		],
		default: 'get',
	},
];

/**
 * The DNS record types, keyed by the path segment of their create and update
 * endpoints. Appwrite names the type of a record in capitals.
 */
export const DNS_RECORD_TYPES: Array<INodePropertyOptions & { value: string }> = [
	{ name: 'A', value: 'a', description: 'Points a name to an IPv4 address' },
	{ name: 'AAAA', value: 'aaaa', description: 'Points a name to an IPv6 address' },
	{
		name: 'ALIAS',
		value: 'alias',
		description:
			'Points a name to another domain name like a CNAME, but also works for the domain itself',
	},
	{
		name: 'CAA',
		value: 'caa',
		description: 'Names the certificate authorities allowed to issue certificates for the domain',
	},
	{ name: 'CNAME', value: 'cname', description: 'Makes a name an alias of another domain name' },
	{
		name: 'HTTPS',
		value: 'https',
		description: 'Tells browsers how to connect to the name securely',
	},
	{ name: 'MX', value: 'mx', description: 'Names a mail server that receives email for the name' },
	{ name: 'NS', value: 'ns', description: 'Delegates a name to other nameservers' },
	{
		name: 'SRV',
		value: 'srv',
		description: 'Names the host and port of a service, such as SIP or XMPP',
	},
	{
		name: 'TXT',
		value: 'txt',
		description: 'Holds text, such as a verification code or SPF policy',
	},
];

/** The email provider presets, keyed by the path segment of their endpoints. */
const PRESETS: INodePropertyOptions[] = [
	{ name: 'Google Workspace', value: 'google-workspace' },
	{ name: 'iCloud', value: 'icloud' },
	{ name: 'Mailgun', value: 'mailgun' },
	{ name: 'Outlook', value: 'outlook' },
	{ name: 'Proton Mail', value: 'proton-mail' },
	{ name: 'Zoho Mail', value: 'zoho' },
];

const show = (...operations: string[]) => ({ resource: ['domain'], operation: operations });

const domainLocator = (displayed: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'domainId',
			displayName: 'Domain',
			kind: 'domain',
			searchListMethod: 'searchDomains',
			placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
			urlPlaceholder:
				'e.g. https://cloud.appwrite.io/console/organization-my-org/domains/domain-6650f1a2003e4b5c6d7e',
			description: 'The domain to use',
		},
		displayed,
	);

/** A DNS record. The Console gives a record no page of its own, so it has no By URL mode. */
const recordLocator = (displayed: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'dnsRecordId',
			displayName: 'Record',
			kind: 'record',
			searchListMethod: 'searchDnsRecords',
			placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
			dependsOn: ['domainId.value'],
			description: 'The DNS record to use',
		},
		displayed,
	);

const RECORD_NAME_HELP =
	'The name the record is for, relative to the domain, e.g. www for www.example.com';
const TTL_HELP =
	'How long, in seconds, resolvers may cache the record. Lower values take effect sooner after a change.';
const PRIORITY_HELP = 'The preference of the record: lower values are tried first';
const WEIGHT_HELP =
	'How to share load between records of the same priority: higher values get more';

export const domainFields: INodeProperties[] = [
	domainLocator(
		show(
			'createPreset',
			'createRecord',
			'delete',
			'deleteRecord',
			'get',
			'getManyRecords',
			'getPreset',
			'getRecord',
			'getTransferStatus',
			'getZone',
			'updateNameservers',
			'updateRecord',
			'updateTeam',
			'updateZone',
			'verifyNameservers',
		),
	),
	{
		displayName:
			"This removes the domain and all its DNS records from the organization, including the records that route its hostnames to Appwrite Sites, Functions, or a project's custom domains. It cannot be undone.",
		name: 'domainDeleteNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: show('delete') },
	},
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. example.com',
		description:
			'The domain to add, e.g. example.com. To host its DNS in Appwrite, point its nameservers to ns1.appwrite.zone and ns2.appwrite.zone at its registrar, then run Verify Nameservers.',
		displayOptions: { show: show('create') },
	},
	simplifyProperty('domain', ['get', 'getMany', 'getManyRecords', 'getPreset', 'getRecord']),

	// Changing organization
	{
		displayName:
			"This moves the domain and all its DNS records out of the credential's organization, which then loses access to them. Appwrite allows it only when the caller is also an owner of the destination organization.",
		name: 'domainMoveNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: show('updateTeam') },
	},
	{
		displayName: 'Destination Organization ID',
		name: 'domainOrganizationId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 5f9a9b9a9b9a9',
		description: 'The ID of the organization to move the domain to',
		displayOptions: { show: show('updateTeam') },
	},

	// Pricing
	{
		displayName: 'Domain Names',
		name: 'domainNames',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. example.com, example.io',
		description: 'The domain names to check, as a comma-separated list or a JSON array. Up to 50.',
		displayOptions: { show: show('listPrices') },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show('listPrices') },
		options: [
			{
				displayName: 'Period (Years)',
				name: 'domainPeriodYears',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'The number of years to price',
			},
			{
				displayName: 'Price For',
				name: 'domainRegistrationType',
				type: 'options',
				options: [
					{
						name: 'New Registration',
						value: 'new',
						description: 'Registering a domain nobody holds',
					},
					{ name: 'Renewal', value: 'renewal', description: 'Renewing an existing registration' },
					{
						name: 'Trade',
						value: 'trade',
						description: 'Changing the registrant (owner) of the domain',
					},
					{
						name: 'Transfer',
						value: 'transfer',
						description: 'Moving a registration to Appwrite from another registrar',
					},
				],
				default: 'new',
				description: 'Which price to look up',
			},
		],
	},

	// Nameservers
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show('updateNameservers') },
		options: [
			{
				displayName: 'Nameservers',
				name: 'domainNameservers',
				type: 'string',
				default: '',
				placeholder: 'e.g. ns1.example.net, ns2.example.net',
				description:
					"The nameservers to set, as a comma-separated list or a JSON array. Leave this out to use Appwrite's nameservers.",
			},
		],
	},

	// Zone file
	{
		displayName: 'Zone File',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 8 },
		required: true,
		default: '',
		placeholder: 'e.g. www 3600 IN CNAME appwrite.network.',
		description: 'The zone file content to import, in the standard (BIND) zone file format',
		displayOptions: { show: show('updateZone') },
	},

	// Presets
	{
		displayName: 'Preset',
		name: 'domainPreset',
		type: 'options',
		options: PRESETS,
		default: 'google-workspace',
		description: 'The email provider whose DNS records to use',
		displayOptions: { show: show('createPreset', 'getPreset') },
	},

	// Records
	{
		displayName: 'Record Type',
		name: 'dnsRecordType',
		type: 'options',
		options: DNS_RECORD_TYPES,
		default: 'a',
		description: 'The type of the DNS record',
		displayOptions: { show: show('createRecord', 'updateRecord') },
	},
	recordLocator(show('deleteRecord', 'getRecord', 'updateRecord')),
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. www',
		description: RECORD_NAME_HELP,
		displayOptions: { show: show('createRecord') },
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 203.0.113.10',
		description:
			'What the record points to or holds, e.g. an IPv4 address for A, a domain name for CNAME or MX, 0 issue "letsencrypt.org" for CAA, or text for TXT',
		displayOptions: { show: show('createRecord') },
	},
	{
		displayName: 'TTL',
		name: 'ttl',
		type: 'number',
		typeOptions: { minValue: 1 },
		required: true,
		default: 3600,
		description: TTL_HELP,
		displayOptions: { show: show('createRecord') },
	},
	{
		displayName: 'Priority',
		name: 'dnsRecordPriority',
		type: 'number',
		typeOptions: { minValue: 0 },
		required: true,
		default: 10,
		description: PRIORITY_HELP,
		displayOptions: { show: { ...show('createRecord'), dnsRecordType: ['mx', 'srv'] } },
	},
	{
		displayName: 'Weight',
		name: 'dnsRecordWeight',
		type: 'number',
		typeOptions: { minValue: 0 },
		required: true,
		default: 0,
		description: WEIGHT_HELP,
		displayOptions: { show: { ...show('createRecord'), dnsRecordType: ['srv'] } },
	},
	{
		displayName: 'Port',
		name: 'dnsRecordPort',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 65535 },
		required: true,
		default: 0,
		description: 'The port the service listens on',
		displayOptions: { show: { ...show('createRecord'), dnsRecordType: ['srv'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show('createRecord') },
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'A note on what the record is for',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description: 'The settings to change. Settings you do not add keep their current values.',
		displayOptions: { show: show('updateRecord') },
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'A note on what the record is for',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. www',
				description: RECORD_NAME_HELP,
			},
			{
				displayName: 'Port',
				name: 'dnsRecordPort',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 65535 },
				default: 0,
				description: 'The port the service listens on',
				displayOptions: { show: { '/dnsRecordType': ['srv'] } },
			},
			{
				displayName: 'Priority',
				name: 'dnsRecordPriority',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 10,
				description: PRIORITY_HELP,
				displayOptions: { show: { '/dnsRecordType': ['mx', 'srv'] } },
			},
			{
				displayName: 'TTL',
				name: 'ttl',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 3600,
				description: TTL_HELP,
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				description: 'What the record points to or holds',
			},
			{
				displayName: 'Weight',
				name: 'dnsRecordWeight',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: WEIGHT_HELP,
				displayOptions: { show: { '/dnsRecordType': ['srv'] } },
			},
		],
	},

	...returnAllAndLimitProperties('domain', ['getMany', 'getManyRecords']),
	...queriesProperties('domain', ['getMany']),
	...queriesProperties('domain', ['getManyRecords'], {
		hint: 'You can filter on type, name, and value',
	}),
	listOptionsProperty('domain', ['getMany']),
];
