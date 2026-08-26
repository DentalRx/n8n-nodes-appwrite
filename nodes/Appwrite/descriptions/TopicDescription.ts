import type { INodeProperties } from 'n8n-workflow';

import { listOptionsProperty, queriesProperties, returnAllAndLimitProperties } from './shared';

export const topicOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['topic'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new topic',
				action: 'Create a topic',
			},
			{
				name: 'Create Subscriber',
				value: 'createSubscriber',
				description: 'Subscribe a target to a topic',
				action: 'Create a topic subscriber',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a topic',
				action: 'Delete a topic',
			},
			{
				name: 'Delete Subscriber',
				value: 'deleteSubscriber',
				description: 'Delete a subscriber from a topic',
				action: 'Delete a topic subscriber',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a topic by ID',
				action: 'Get a topic',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List topics, with optional filters',
				action: 'Get many topics',
			},
			{
				name: 'Get Many Subscribers',
				value: 'getManySubscribers',
				description: 'List the subscribers of a topic',
				action: 'Get many topic subscribers',
			},
			{
				name: 'Get Subscriber',
				value: 'getSubscriber',
				description: 'Get a subscriber of a topic by ID',
				action: 'Get a topic subscriber',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a topic',
				action: 'Update a topic',
			},
		],
		default: 'get',
	},
];

export const topicFields: INodeProperties[] = [
	{
		displayName: 'Topic Name or ID',
		name: 'topicId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getTopics' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: [
					'createSubscriber',
					'delete',
					'deleteSubscriber',
					'get',
					'getManySubscribers',
					'getSubscriber',
					'update',
				],
			},
		},
	},
	{
		displayName: 'Topic ID',
		name: 'topicId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the topic. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['topic'],
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
		description: 'The name of the topic',
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Subscribe Roles',
		name: 'subscribe',
		type: 'string',
		default: '',
		placeholder: 'users, user:abc',
		description:
			'Role strings granted subscribe permission, as a comma-separated list or a JSON array. By default all users are granted subscribe permission. Maximum of 100 roles, each up to 64 characters long.',
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Subscriber ID',
		name: 'subscriberId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the subscriber',
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['deleteSubscriber', 'getSubscriber'],
			},
		},
	},
	{
		displayName: 'Subscriber ID',
		name: 'subscriberId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the subscriber. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['createSubscriber'],
			},
		},
	},
	{
		displayName: 'Target ID',
		name: 'targetId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the target to link to the topic',
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['createSubscriber'],
			},
		},
	},
	...returnAllAndLimitProperties('topic', ['getMany', 'getManySubscribers']),
	...queriesProperties('topic', ['getMany', 'getManySubscribers']),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the topic',
			},
			{
				displayName: 'Subscribe Roles',
				name: 'subscribe',
				type: 'string',
				default: '',
				placeholder: 'users, user:abc',
				description:
					'Role strings granted subscribe permission, as a comma-separated list or a JSON array. Maximum of 100 roles, each up to 64 characters long.',
			},
		],
	},
	listOptionsProperty('topic', ['getMany', 'getManySubscribers']),
];
