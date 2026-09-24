import type { INodeProperties } from 'n8n-workflow';

import { platformLocator } from './locators';
import { queriesProperties, returnAllAndLimitProperties } from './shared';

/**
 * The kinds of app a platform registers. Each kind has its own create and
 * update endpoints (`/project/platforms/<type>`), which take the platform's
 * name and one identifier under a kind-specific body key.
 */
export interface PlatformType {
	/** The platform type Appwrite uses in paths and in the `type` field. */
	value: string;
	name: string;
	identifier: {
		/** The key Appwrite expects in the request body. */
		body: string;
		displayName: string;
		description: string;
		placeholder: string;
	};
}

export const PLATFORM_TYPES: PlatformType[] = [
	{
		value: 'android',
		name: 'Android',
		identifier: {
			body: 'applicationId',
			displayName: 'Package Name',
			description:
				"The app's package name, usually the applicationId in its app-level build.gradle file",
			placeholder: 'e.g. com.company.appname',
		},
	},
	{
		value: 'apple',
		name: 'Apple',
		identifier: {
			body: 'bundleIdentifier',
			displayName: 'Bundle ID',
			description:
				"The app's bundle identifier, shown in the General tab of its primary target in Xcode",
			placeholder: 'e.g. com.company.appname',
		},
	},
	{
		value: 'linux',
		name: 'Linux',
		identifier: {
			body: 'packageName',
			displayName: 'Package Name',
			description: "The app's package name",
			placeholder: 'e.g. com.company.appname',
		},
	},
	{
		value: 'web',
		name: 'Web',
		identifier: {
			body: 'hostname',
			displayName: 'Hostname',
			description:
				'The hostname the website calls Appwrite from, without protocol or port. Appwrite only accepts browser requests from registered hostnames.',
			placeholder: 'e.g. app.example.com',
		},
	},
	{
		value: 'windows',
		name: 'Windows',
		identifier: {
			body: 'packageIdentifierName',
			displayName: 'Package Identifier Name',
			description: "The app's package identifier name",
			placeholder: 'e.g. com.company.appname',
		},
	},
];

export const platformOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['platform'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Register a web, Apple, Android, Windows, or Linux app that uses the project',
				action: 'Create platform',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a platform permanently, so its app can no longer use the project',
				action: 'Delete platform',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a platform',
				action: 'Get platform',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: "Retrieve a list of the project's platforms",
				action: 'Get many platforms',
			},
			{
				name: 'Update',
				value: 'update',
				description: "Rename a platform or change its app's identifier",
				action: 'Update platform',
			},
		],
		default: 'get',
	},
];

const show = (operation: string, type?: PlatformType) => ({
	resource: ['platform'],
	operation: [operation],
	...(type === undefined ? {} : { platformType: [type.value] }),
});

/** The identifier field of a platform type, required on create and optional on update. */
const identifier = (type: PlatformType): INodeProperties => ({
	displayName: type.identifier.displayName,
	name: 'platformIdentifier',
	type: 'string',
	default: '',
	placeholder: type.identifier.placeholder,
	description: type.identifier.description,
});

const updatedName: INodeProperties = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	default: '',
	description: 'The name of the platform. Max length: 128 characters.',
};

export const platformFields: INodeProperties[] = [
	platformLocator({ resource: ['platform'], operation: ['delete', 'get', 'update'] }),
	{
		displayName: 'Platform Type',
		name: 'platformType',
		type: 'options',
		noDataExpression: true,
		options: PLATFORM_TYPES.map((type) => ({ name: type.name, value: type.value })),
		default: 'web',
		description: 'The kind of app the platform is for',
		displayOptions: {
			show: {
				resource: ['platform'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. My Web App',
		description: 'The name of the platform. Max length: 128 characters.',
		displayOptions: { show: show('create') },
	},
	...PLATFORM_TYPES.map((type): INodeProperties => ({
		...identifier(type),
		required: true,
		displayOptions: { show: show('create', type) },
	})),
	{
		displayName: 'Platform ID',
		name: 'platformId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the platform. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: { show: show('create') },
	},
	// One Update Fields collection per type, so the identifier carries the
	// label and description of the chosen kind of app.
	...PLATFORM_TYPES.map((type): INodeProperties => ({
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description: 'The settings to change. Settings you do not add keep their current values.',
		displayOptions: { show: show('update', type) },
		options: [identifier(type), updatedName].sort((a, b) =>
			a.displayName.localeCompare(b.displayName),
		),
	})),
	...returnAllAndLimitProperties('platform', ['getMany']),
	...queriesProperties('platform', ['getMany'], {
		hint: 'You can filter on type, name, hostname, bundleIdentifier, applicationId, packageName, and packageIdentifierName',
	}),
];
