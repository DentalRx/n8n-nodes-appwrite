import type { INodeProperties } from 'n8n-workflow';

import { OAUTH2_PROVIDERS } from './oauth2Providers';
import { returnAllAndLimitProperties } from './shared';

export const oauth2ProviderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['oauth2Provider'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description:
					'Retrieve the sign-in settings of one OAuth2 provider. Secrets always come back empty.',
				action: 'Get auth provider',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve the sign-in settings of every OAuth2 provider Appwrite offers',
				action: 'Get many auth providers',
			},
			{
				name: 'Update',
				value: 'update',
				description:
					'Set the app credentials of an OAuth2 provider and turn sign-in with it on or off',
				action: 'Update auth provider',
			},
		],
		default: 'get',
	},
];

const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name);

export const oauth2ProviderFields: INodeProperties[] = [
	{
		displayName: 'Provider',
		name: 'oauth2Provider',
		type: 'options',
		noDataExpression: true,
		options: [...OAUTH2_PROVIDERS]
			.sort(byName)
			.map((provider) => ({ name: provider.name, value: provider.value })),
		default: 'github',
		description: 'The OAuth2 provider users sign in with',
		displayOptions: {
			show: {
				resource: ['oauth2Provider'],
				operation: ['get', 'update'],
			},
		},
	},
	// One Update Fields collection per provider, so each shows exactly the
	// settings that provider's endpoint accepts, under the provider's own names.
	...OAUTH2_PROVIDERS.map((provider): INodeProperties => ({
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['oauth2Provider'],
				operation: ['update'],
				oauth2Provider: [provider.value],
			},
		},
		options: provider.fields
			.map((field) => field.property)
			.sort((a, b) => a.displayName.localeCompare(b.displayName)),
	})),
	...returnAllAndLimitProperties('oauth2Provider', ['getMany']),
];
