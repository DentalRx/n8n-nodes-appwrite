import type { INodeProperties } from 'n8n-workflow';

import { returnAllAndLimitProperties } from './shared';

export const mockPhoneOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['mockPhone'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description:
					'Add a test phone number that signs in with a fixed code, without sending an SMS',
				action: 'Create mock phone number',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a mock phone number permanently',
				action: 'Delete mock phone number',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a mock phone number and its verification code',
				action: 'Get mock phone number',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: "Retrieve a list of the project's mock phone numbers and their codes",
				action: 'Get many mock phone numbers',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the verification code of a mock phone number',
				action: 'Update mock phone number',
			},
		],
		default: 'get',
	},
];

export const mockPhoneFields: INodeProperties[] = [
	{
		displayName: 'Phone Number',
		name: 'phone',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. +12065550100',
		description: 'The mock phone number, in E.164 format: a + followed by up to 15 digits',
		displayOptions: {
			show: {
				resource: ['mockPhone'],
				operation: ['create', 'delete', 'get', 'update'],
			},
		},
	},
	{
		displayName: 'Verification Code',
		name: 'mockPhoneCode',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 123456',
		description: 'The 6-digit code that signs in with this number, in place of one sent by SMS',
		displayOptions: {
			show: {
				resource: ['mockPhone'],
				operation: ['create', 'update'],
			},
		},
	},
	...returnAllAndLimitProperties('mockPhone', ['getMany']),
];
