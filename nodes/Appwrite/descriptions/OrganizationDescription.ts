import type { INodeProperties } from 'n8n-workflow';

import {
	listOptionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	simplifyProperty,
} from './shared';

/**
 * The organization the Appwrite Organization API credential belongs to, with
 * its members and the apps installed on it. Its projects are the Organization
 * Project resource.
 */

export const organizationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['organization'],
			},
		},
		options: [
			{
				name: 'Create Installation',
				value: 'createInstallation',
				description:
					'Install an app on the organization. The installation gets the scopes the app asks for now.',
				action: 'Create organization installation',
			},
			{
				name: 'Create Membership',
				value: 'createMembership',
				description: 'Invite a new member to join the organization',
				action: 'Create organization membership',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete the organization and every project in it permanently',
				action: 'Delete organization',
			},
			{
				name: 'Delete Installation',
				value: 'deleteInstallation',
				description:
					'Uninstall an app from the organization and revoke the tokens of that installation',
				action: 'Delete organization installation',
			},
			{
				name: 'Delete Membership',
				value: 'deleteMembership',
				description: 'Remove a member from the organization, or withdraw a pending invitation',
				action: 'Delete organization membership',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve the organization, including its plan and billing details',
				action: 'Get organization',
			},
			{
				name: 'Get Installation',
				value: 'getInstallation',
				description: 'Get an app installation on the organization by ID',
				action: 'Get organization installation',
			},
			{
				name: 'Get Many Installations',
				value: 'getManyInstallations',
				description: 'List the apps installed on the organization',
				action: 'Get many organization installations',
			},
			{
				name: 'Get Many Memberships',
				value: 'getManyMemberships',
				description: 'List the members of the organization, with optional filters',
				action: 'Get many organization memberships',
			},
			{
				name: 'Get Membership',
				value: 'getMembership',
				description: 'Get an organization membership by ID',
				action: 'Get organization membership',
			},
			{
				name: 'Update Installation',
				value: 'updateInstallation',
				description:
					"Change an installation's authorization details and refresh its scopes to the ones the app asks for now. Its tokens are revoked.",
				action: 'Update organization installation',
			},
			{
				name: 'Update Membership',
				value: 'updateMembership',
				description: 'Update the roles of an organization member',
				action: 'Update organization membership',
			},
			{
				name: 'Update Name',
				value: 'updateName',
				description: 'Update the name of the organization',
				action: 'Update organization name',
			},
		],
		default: 'get',
	},
];

const show = (...operations: string[]) => ({ resource: ['organization'], operation: operations });

const AUTHORIZATION_DETAILS_HELP =
	'What the installation may access, as a JSON array of objects that each have a type plus fields the app defines, e.g. [{"type": "project", "identifiers": ["*"]}]. The Appwrite Console stores the authorized project IDs here.';

const AUTHORIZATION_DETAILS_UPDATE_HELP = `${AUTHORIZATION_DETAILS_HELP} Replaces the current details.`;

export const organizationFields: INodeProperties[] = [
	{
		displayName:
			'This deletes the organization the credential belongs to, with every project in it and all their data. It cannot be undone.',
		name: 'organizationDeleteNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: show('delete') },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The new name of the organization. Max length: 128 characters.',
		displayOptions: { show: show('updateName') },
	},
	simplifyProperty('organization', ['get', 'getManyMemberships', 'getMembership']),

	// Memberships
	{
		displayName: 'Membership ID',
		name: 'membershipId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the membership, as returned by Get Many Memberships',
		displayOptions: { show: show('deleteMembership', 'getMembership', 'updateMembership') },
	},
	{
		displayName: 'Roles',
		name: 'roles',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. developer',
		description:
			'The roles to give the member in the organization, such as owner or developer, as a comma-separated list or a JSON array',
		displayOptions: { show: show('createMembership', 'updateMembership') },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		placeholder: 'e.g. name@email.com',
		description:
			'The email address to send the invitation to. Set at least one of Email, User ID, or Phone.',
		displayOptions: { show: show('createMembership') },
	},
	{
		displayName: 'User ID',
		name: 'organizationUserId',
		type: 'string',
		default: '',
		placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
		description:
			'The ID of an existing Appwrite account to add to the organization. Set at least one of Email, User ID, or Phone.',
		displayOptions: { show: show('createMembership') },
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		placeholder: 'e.g. +16175551212',
		description:
			'The phone number of the new member, with a leading + and a country code. Set at least one of Email, User ID, or Phone.',
		displayOptions: { show: show('createMembership') },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show('createMembership') },
		options: [
			{
				displayName: 'Member Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the new member. Max length: 128 characters.',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com/invite',
				description:
					'The URL the invitation email links back to. Not required when an API key is supplied.',
			},
		],
	},
	listOptionsProperty('organization', ['getManyMemberships']),

	// Installations
	{
		displayName: 'App ID',
		name: 'installationAppId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
		description: 'The ID of the app to install on the organization',
		displayOptions: { show: show('createInstallation') },
	},
	{
		displayName: 'Installation ID',
		name: 'installationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the installation, as returned by Get Many Installations',
		displayOptions: {
			show: show('deleteInstallation', 'getInstallation', 'updateInstallation'),
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: show('createInstallation') },
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
		displayOptions: { show: show('updateInstallation') },
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

	...returnAllAndLimitProperties('organization', ['getManyInstallations', 'getManyMemberships']),
	...queriesProperties('organization', ['getManyInstallations']),
	...queriesProperties('organization', ['getManyMemberships'], {
		hint: 'You can filter on userId, invited, joined, confirm, and roles',
	}),
];
