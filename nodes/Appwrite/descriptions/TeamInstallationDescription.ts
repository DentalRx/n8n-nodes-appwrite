import type { INodeProperties } from 'n8n-workflow';

import { appLocator } from './locators';

/**
 * The fields of the Team resource's installation operations: the apps
 * installed on a team. TeamDescription lists the operations and adds them to
 * the Team, Return All, Limit and Queries fields it shares with them.
 */

const AUTHORIZATION_DETAILS_HELP =
	'What the installation may access, as a JSON array of objects that each have a type plus fields the app defines, e.g. [{"type": "project", "identifiers": ["*"]}]. The Appwrite Console stores the authorized project IDs here.';

const AUTHORIZATION_DETAILS_UPDATE_HELP = `${AUTHORIZATION_DETAILS_HELP} Replaces the current details.`;

export const teamInstallationFields: INodeProperties[] = [
	appLocator(
		{ resource: ['team'], operation: ['createInstallation'] },
		{ description: 'The app to install on the team' },
	),
	{
		displayName: 'Installation ID',
		name: 'installationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the installation, as returned by Get Many Installations',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['deleteInstallation', 'getInstallation', 'updateInstallation'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['createInstallation'],
			},
		},
		options: [
			{
				displayName: 'Authorization Details',
				name: 'authorizationDetails',
				type: 'json',
				default: '[]',
				description: AUTHORIZATION_DETAILS_HELP,
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
				resource: ['team'],
				operation: ['updateInstallation'],
			},
		},
		options: [
			{
				displayName: 'Authorization Details',
				name: 'authorizationDetails',
				type: 'json',
				default: '[]',
				description: AUTHORIZATION_DETAILS_UPDATE_HELP,
			},
		],
	},
];
