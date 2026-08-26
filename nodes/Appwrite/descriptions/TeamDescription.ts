import type { INodeProperties } from 'n8n-workflow';

import { queriesProperties, returnAllAndLimitProperties } from './shared';

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
				name: 'Create',
				value: 'create',
				description: 'Create a new team',
				action: 'Create a team',
			},
			{
				name: 'Create Membership',
				value: 'createMembership',
				description: 'Invite a new member to join a team',
				action: 'Create a team membership',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a team',
				action: 'Delete a team',
			},
			{
				name: 'Delete Membership',
				value: 'deleteMembership',
				description: 'Remove a membership from a team',
				action: 'Delete a team membership',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a team by ID',
				action: 'Get a team',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List teams, with optional filters',
				action: 'Get many teams',
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
				action: 'Get a team membership',
			},
			{
				name: 'Get Preferences',
				value: 'getPrefs',
				description: 'Get the shared preferences of a team',
				action: 'Get team preferences',
			},
			{
				name: 'Update Membership',
				value: 'updateMembership',
				description: 'Update the roles of a team member',
				action: 'Update a team membership',
			},
			{
				name: 'Update Name',
				value: 'updateName',
				description: 'Update the name of a team',
				action: 'Update a team name',
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
	{
		displayName: 'Team ID',
		name: 'teamId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the team',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: [
					'createMembership',
					'delete',
					'deleteMembership',
					'get',
					'getManyMemberships',
					'getMembership',
					'getPrefs',
					'updateMembership',
					'updateName',
					'updatePrefs',
				],
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
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the team. Max length: 128 chars.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['create', 'updateName'],
			},
		},
	},
	{
		displayName: 'Roles',
		name: 'roles',
		type: 'string',
		default: '',
		placeholder: 'owner, editor',
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
		description: 'The ID of the membership',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['deleteMembership', 'getMembership', 'updateMembership'],
			},
		},
	},
	{
		displayName: 'Roles',
		name: 'roles',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'member, editor',
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
		placeholder: 'name@email.com',
		description:
			'The email of the new team member. Provide at least one of email, user ID, or phone; if more than one is given, Appwrite prioritizes user ID, then email, then phone.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['createMembership'],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		description:
			'The ID of an existing user to add to the team. At least one of email, user ID, or phone is required.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['createMembership'],
			},
		},
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		placeholder: '+16175551212',
		description:
			'The phone number of the new team member, with a leading + and a country code. At least one of email, user ID, or phone is required.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['createMembership'],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		description:
			'The URL to redirect the user back to your app from the invitation email. Not required when an API key is supplied. Only URLs from hostnames in your project platform list are allowed.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['createMembership'],
			},
		},
	},
	{
		displayName: 'Member Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The name of the new team member. Max length: 128 chars.',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['createMembership'],
			},
		},
	},
	{
		displayName: 'Search',
		name: 'search',
		type: 'string',
		default: '',
		description: 'Search term to filter the list results',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['getMany', 'getManyMemberships'],
			},
		},
	},
	...returnAllAndLimitProperties('team', ['getMany', 'getManyMemberships']),
	...queriesProperties('team', ['getMany', 'getManyMemberships']),
	{
		displayName: 'Preferences',
		name: 'prefs',
		type: 'json',
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
];
