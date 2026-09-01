import type { INodeProperties } from 'n8n-workflow';

export const healthOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['health'],
			},
		},
		options: [
			{
				name: 'Get Antivirus',
				value: 'getAntivirus',
				description: 'Check the Appwrite antivirus server is up and connection is successful',
				action: 'Get antivirus health status',
			},
			{
				name: 'Get Cache',
				value: 'getCache',
				description:
					'Check the Appwrite in-memory cache servers are up and connection is successful',
				action: 'Get cache health status',
			},
			{
				name: 'Get Certificate',
				value: 'getCertificate',
				description: 'Get the SSL certificate for a domain',
				action: 'Get SSL certificate health status',
			},
			{
				name: 'Get Database',
				value: 'getDatabase',
				description: 'Check the Appwrite database servers are up and connection is successful',
				action: 'Get database health status',
			},
			{
				name: 'Get HTTP',
				value: 'get',
				description: 'Check the Appwrite HTTP server is up and responsive',
				action: 'Get HTTP health status',
			},
			{
				name: 'Get Local Storage',
				value: 'getStorageLocal',
				description: 'Check the Appwrite local storage device is up and connection is successful',
				action: 'Get local storage health status',
			},
			{
				name: 'Get PubSub',
				value: 'getPubSub',
				description: 'Check the Appwrite PubSub servers are up and connection is successful',
				action: 'Get pubsub health status',
			},
			{
				name: 'Get Storage',
				value: 'getStorage',
				description: 'Check the Appwrite storage device is up and connection is successful',
				action: 'Get storage health status',
			},
			{
				name: 'Get Time',
				value: 'getTime',
				description: 'Check the Appwrite server time is synced with the remote NTP server',
				action: 'Get server time health status',
			},
		],
		default: 'get',
	},
];

export const healthFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['health'],
				operation: ['getCertificate'],
			},
		},
		options: [
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				placeholder: 'e.g. example.com',
				description:
					'The domain to fetch the SSL certificate for. Leave empty to check the Appwrite endpoint domain.',
			},
		],
	},
];
