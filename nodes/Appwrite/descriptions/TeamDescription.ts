import type { INodeProperties } from 'n8n-workflow';

import { teamLocator, userLocator } from './locators';
import { listOptionsProperty, queriesProperties, returnAllAndLimitProperties } from './shared';
import { teamInstallationFields } from './TeamInstallationDescription';

export const teamOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['team'],
			},
		},
		options: [
			{
				name: 'Accept Membership Invitation',
				value: 'updateMembershipStatus',
				description:
					"Accept an invitation to join a team on the invited user's behalf, using the user ID and secret from the invitation link",
				action: 'Accept team membership invitation',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new team',
				action: 'Create team',
			},
			{
				name: 'Create Installation',
				value: 'createInstallation',
				description:
					'Install an app on a team. The installation gets the scopes the app asks for now.',
				action: 'Create team installation',
			},
			{
				name: 'Create Membership',
				value: 'createMembership',
				description: 'Invite a new member to join a team',
				action: 'Create team membership',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a team permanently',
				action: 'Delete team',
			},
			{
				name: 'Delete Installation',
				value: 'deleteInstallation',
				description: 'Uninstall an app from a team and revoke the tokens of that installation',
				action: 'Delete team installation',
			},
			{
				name: 'Delete Membership',
				value: 'deleteMembership',
				description: 'Remove a membership from a team',
				action: 'Delete team membership',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single team by its ID',
				action: 'Get team',
			},
			{
				name: 'Get Installation',
				value: 'getInstallation',
				description: 'Get an app installation on a team by ID',
				action: 'Get team installation',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List teams, with optional filters',
				action: 'Get many teams',
			},
			{
				name: 'Get Many Installations',
				value: 'getManyInstallations',
				description: 'List the apps installed on a team',
				action: 'Get many team installations',
			},
			{
				name: 'Get Many Memberships',
				value: 'getManyMemberships',
				description: 'List the memberships of a team, with optional filters',
				action: 'Get many team memberships',
			},
			{
				name: 'Get Membership',
				value: 'getMembership',
				description: 'Get a team membership by ID',
				action: 'Get team membership',
			},
			{
				name: 'Get Preferences',
				value: 'getPrefs',
				description: 'Get the shared preferences of a team',
				action: 'Get team preferences',
			},
			{
				name: 'Update Installation',
				value: 'updateInstallation',
				description:
					"Change an installation's authorization details and refresh its scopes to the ones the app asks for now. Its tokens are revoked.",
				action: 'Update team installation',
			},
			{
				name: 'Update Membership',
				value: 'updateMembership',
				description: 'Update the roles of a team member',
				action: 'Update team membership',
			},
			{
				name: 'Update Name',
				value: 'updateName',
				description: 'Update the name of a team',
				action: 'Update team name',
			},
			{
				name: 'Update Preferences',
				value: 'updatePrefs',
				description: 'Update the shared preferences of a team',
				action: 'Update team preferences',
			},
		],
		default: 'get',
	},
];

export const teamFields: INodeProperties[] = [
	teamLocator({
		resource: ['team'],
		operation: [
			'createInstallation',
			'createMembership',
			'delete',
			'deleteInstallation',
			'deleteMembership',
			'get',
			'getInstallation',
			'getManyInstallations',
			'getManyMemberships',
			'getMembership',
			'getPrefs',
			'updateInstallation',
			'updateMembership',
			'updateMembershipStatus',
			'updateName',
			'updatePrefs',
		],
	}),
	...teamInstallationFields,
	userLocator(
		{ resource: ['team'], operation: ['updateMembershipStatus'] },
		{ description: 'The invited user, from the userId parameter of the invitation link' },
	),
	{
		displayName: 'Invitation Secret',
		name: 'membershipSecret',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The secret parameter of the invitation link Appwrite sent to the invited user',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['updateMembershipStatus'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the team. Max length: 128 characters.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['create', 'updateName'],
			},
		},
	},
	{
		displayName: 'Team ID',
		name: 'teamId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the team. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Roles',
		name: 'roles',
		type: 'string',
		default: '',
		placeholder: 'e.g. owner, editor',
		description:
			'The roles to assign to the user who creates the team, as a comma-separated list or a JSON array. A role can be any string, each up to 32 characters long. Leave empty to use the default owner role.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Membership ID',
		name: 'membershipId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the membership, as returned by Get Many Memberships',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: [
					'deleteMembership',
					'getMembership',
					'updateMembership',
					'updateMembershipStatus',
				],
			},
		},
	},
	{
		displayName: 'Roles',
		name: 'roles',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. member, editor',
		description:
			'The roles to assign to the member, as a comma-separated list or a JSON array. A role can be any string, each up to 32 characters long.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['createMembership', 'updateMembership'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		placeholder: 'e.g. name@email.com',
		description:
			'The email of the new team member. Set at least one of Email, User, or Phone; when more than one is set, Appwrite uses the user, then the email, then the phone.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['createMembership'],
			},
		},
	},
	userLocator(
		{ resource: ['team'], operation: ['createMembership'] },
		{
			required: false,
			description: 'The existing user to add to the team',
			hint: 'Set at least one of Email, User, or Phone',
		},
	),
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		placeholder: 'e.g. +16175551212',
		description:
			'The phone number of the new team member, with a leading + and a country code. Set at least one of Email, User, or Phone; when more than one is set, Appwrite uses the user, then the email, then the phone.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['createMembership'],
			},
		},
	},
	...returnAllAndLimitProperties('team', ['getMany', 'getManyInstallations', 'getManyMemberships']),
	...queriesProperties('team', ['getMany', 'getManyInstallations', 'getManyMemberships']),
	{
		displayName: 'Preferences',
		name: 'prefs',
		type: 'json',
		required: true,
		default: '{}',
		description:
			'The preferences as a JSON key-value object. The object is stored as-is and replaces all previously set preferences. Max size: 64kB.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['updatePrefs'],
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
				operation: ['createMembership'],
			},
		},
		options: [
			{
				displayName: 'Member Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the new team member. Max length: 128 characters.',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com/invite',
				description:
					'The URL to redirect the user back to your app from the invitation email. Not required when an API key is supplied. Only URLs from hostnames in your project platform list are allowed.',
			},
		],
	},
	listOptionsProperty('team', ['getMany', 'getManyMemberships']),
];
