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
				name: 'Get',
				value: 'get',
				description: 'Check the Appwrite HTTP server is up and responsive',
				action: 'Get the HTTP health status',
			},
			{
				name: 'Get Antivirus',
				value: 'getAntivirus',
				description: 'Check the Appwrite antivirus server is up and connection is successful',
				action: 'Get the antivirus health status',
			},
			{
				name: 'Get Cache',
				value: 'getCache',
				description:
					'Check the Appwrite in-memory cache servers are up and connection is successful',
				action: 'Get the cache health status',
			},
			{
				name: 'Get Certificate',
				value: 'getCertificate',
				description: 'Get the SSL certificate for a domain',
				action: 'Get the SSL certificate health status',
			},
			{
				name: 'Get Database',
				value: 'getDatabase',
				description: 'Check the Appwrite database servers are up and connection is successful',
				action: 'Get the database health status',
			},
			{
				name: 'Get Pub Sub',
				value: 'getPubSub',
				description: 'Check the Appwrite pub-sub servers are up and connection is successful',
				action: 'Get the pub sub health status',
			},
			{
				name: 'Get Storage',
				value: 'getStorage',
				description: 'Check the Appwrite storage device is up and connection is successful',
				action: 'Get the storage health status',
			},
			{
				name: 'Get Storage Local',
				value: 'getStorageLocal',
				description: 'Check the Appwrite local storage device is up and connection is successful',
				action: 'Get the local storage health status',
			},
			{
				name: 'Get Time',
				value: 'getTime',
				description: 'Check the Appwrite server time is synced with the remote NTP server',
				action: 'Get the server time health status',
			},
		],
		default: 'get',
	},
];

export const healthFields: INodeProperties[] = [
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		default: '',
		placeholder: 'example.com',
		description:
			'The domain to fetch the SSL certificate for. Leave empty to check the Appwrite endpoint domain.',
		displayOptions: {
			show: {
				resource: ['health'],
				operation: ['getCertificate'],
			},
		},
	},
];
