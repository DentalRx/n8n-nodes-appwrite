import type { INodeProperties } from 'n8n-workflow';

import {
	activateProperty,
	codePackageProperty,
	deploymentIdProperty,
	downloadDeploymentProperties,
	gitSourceProperties,
	specificationOptionsProperty,
	variableProperties,
} from './compute';
import { siteLocator } from './locators';
import {
	listOptionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
	simplifyProperty,
} from './shared';

export const siteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['site'],
			},
		},
		options: [
			{
				name: 'Activate Deployment',
				value: 'activateDeployment',
				description: 'Set the code deployment the site serves',
				action: 'Activate site deployment',
			},
			{
				name: 'Cancel Deployment',
				value: 'cancelDeployment',
				description: 'Stop the build of a deployment that is still waiting or building',
				action: 'Cancel site deployment',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new site',
				action: 'Create site',
			},
			{
				name: 'Create Deployment',
				value: 'createDeployment',
				description: 'Upload a code package as a new deployment of a site',
				action: 'Create site deployment',
			},
			{
				name: 'Create Duplicate Deployment',
				value: 'createDuplicateDeployment',
				description: 'Rebuild an existing deployment with the current site settings',
				action: 'Create duplicate site deployment',
			},
			{
				name: 'Create Template Deployment',
				value: 'createTemplateDeployment',
				description: 'Create a deployment from the code of a site template repository',
				action: 'Create site template deployment',
			},
			{
				name: 'Create Variable',
				value: 'createVariable',
				description: 'Create a new environment variable for a site',
				action: 'Create site variable',
			},
			{
				name: 'Create VCS Deployment',
				value: 'createVcsDeployment',
				description: 'Create a deployment from a branch or commit of the connected Git repository',
				action: 'Create site VCS deployment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a site permanently',
				action: 'Delete site',
			},
			{
				name: 'Delete Deployment',
				value: 'deleteDeployment',
				description: 'Delete a code deployment of a site',
				action: 'Delete site deployment',
			},
			{
				name: 'Delete Log',
				value: 'deleteLog',
				description: 'Delete a request log of a site',
				action: 'Delete site log',
			},
			{
				name: 'Delete Variable',
				value: 'deleteVariable',
				description: 'Delete an environment variable of a site permanently',
				action: 'Delete site variable',
			},
			{
				name: 'Download Deployment',
				value: 'downloadDeployment',
				description: 'Download the source code or build output of a site deployment',
				action: 'Download site deployment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single site by its ID',
				action: 'Get site',
			},
			{
				name: 'Get Deployment',
				value: 'getDeployment',
				description: 'Get a code deployment of a site by ID',
				action: 'Get site deployment',
			},
			{
				name: 'Get Log',
				value: 'getLog',
				description: 'Get a request log of a site by ID',
				action: 'Get site log',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List sites, with optional filters',
				action: 'Get many sites',
			},
			{
				name: 'Get Many Deployments',
				value: 'getManyDeployments',
				description: 'List the code deployments of a site',
				action: 'Get many site deployments',
			},
			{
				name: 'Get Many Frameworks',
				value: 'getManyFrameworks',
				description: 'List the frameworks sites can be built with on this Appwrite instance',
				action: 'Get many site frameworks',
			},
			{
				name: 'Get Many Logs',
				value: 'getManyLogs',
				description: 'List the request logs of a site, with optional filters',
				action: 'Get many site logs',
			},
			{
				name: 'Get Many Specifications',
				value: 'getManySpecifications',
				description: 'List the compute sizes (CPU and memory) sites can use',
				action: 'Get many site specifications',
			},
			{
				name: 'Get Many Variables',
				value: 'getManyVariables',
				description: 'List the environment variables of a site',
				action: 'Get many site variables',
			},
			{
				name: 'Get Variable',
				value: 'getVariable',
				description: 'Get an environment variable of a site by ID',
				action: 'Get site variable',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the configuration of an existing site',
				action: 'Update site',
			},
			{
				name: 'Update Variable',
				value: 'updateVariable',
				description: 'Change the key, value, or secret flag of an environment variable',
				action: 'Update site variable',
			},
		],
		default: 'get',
	},
];

const siteConfigOptions: INodeProperties[] = [
	{
		displayName: 'Build Command',
		name: 'buildCommand',
		type: 'string',
		default: '',
		placeholder: 'e.g. npm run build',
		description: 'The command that builds the site into its output directory',
	},
	{
		displayName: 'Build Runtime Name or ID',
		name: 'buildRuntime',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSiteBuildRuntimes',
			loadOptionsDependsOn: ['options.siteFramework'],
		},
		default: '',
		description:
			'The runtime the site is built with, e.g. node-22. Leave this option out to keep the current runtime. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description:
			'Whether the site is enabled. When disabled, visitors cannot access the site, but server SDKs with an API key still can.',
	},
	{
		displayName: 'Fallback File',
		name: 'fallbackFile',
		type: 'string',
		default: '',
		placeholder: 'e.g. index.html',
		description:
			'The file to serve for paths that match no file, such as index.html for a single-page app. Leave empty to show the Appwrite 404 page.',
	},
	{
		displayName: 'Framework Name or ID',
		name: 'siteFramework',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getFrameworks' },
		default: '',
		description:
			'The framework the site is built with, e.g. nextjs. Leave this option out to keep the current framework. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Install Command',
		name: 'installCommand',
		type: 'string',
		default: '',
		placeholder: 'e.g. npm install',
		description: 'The command that installs the dependencies of the site',
	},
	{
		displayName: 'Logging',
		name: 'logging',
		type: 'boolean',
		default: true,
		description:
			'Whether request logs keep logs and errors. When disabled, the site responds slightly faster.',
	},
	{
		displayName: 'Output Directory',
		name: 'outputDirectory',
		type: 'string',
		default: '',
		placeholder: 'e.g. ./dist',
		description: 'The directory the build command writes the site to',
	},
	{
		displayName: 'Rendering',
		name: 'siteAdapter',
		type: 'options',
		options: [
			{
				name: 'Server-Side Rendering',
				value: 'ssr',
				description: 'Render pages on the server for each request',
			},
			{
				name: 'Static',
				value: 'static',
				description: 'Serve the files the build produced as they are',
			},
		],
		default: 'static',
		description: 'How the site is served. The framework must support the chosen rendering.',
	},
	{
		displayName: 'Scopes',
		name: 'scopes',
		type: 'string',
		default: '',
		placeholder: 'e.g. users.read, databases.read',
		description:
			'API scopes allowed for the API key auto-generated for every build and server-side rendering request, as a comma-separated list or a JSON array. Maximum of 200 scopes.',
	},
	{
		displayName: 'Start Command',
		name: 'startCommand',
		type: 'string',
		default: '',
		placeholder: 'e.g. node server.js',
		description:
			'The command that starts a server-side rendered site. Leave empty to use the default of the framework.',
	},
	{
		displayName: 'Timeout',
		name: 'timeout',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 30,
		description:
			'Maximum request time in seconds. Defaults to 30; the most allowed is set by the Appwrite instance.',
	},
];

export const siteFields: INodeProperties[] = [
	siteLocator({
		resource: ['site'],
		operation: [
			'activateDeployment',
			'cancelDeployment',
			'createDeployment',
			'createDuplicateDeployment',
			'createTemplateDeployment',
			'createVariable',
			'createVcsDeployment',
			'delete',
			'deleteDeployment',
			'deleteLog',
			'deleteVariable',
			'downloadDeployment',
			'get',
			'getDeployment',
			'getLog',
			'getManyDeployments',
			'getManyLogs',
			'getManyVariables',
			'getVariable',
			'update',
			'updateVariable',
		],
	}),
	deploymentIdProperty('site', [
		'activateDeployment',
		'cancelDeployment',
		'deleteDeployment',
		'downloadDeployment',
		'getDeployment',
	]),
	deploymentIdProperty(
		'site',
		['createDuplicateDeployment'],
		'The ID of the deployment to rebuild',
	),
	codePackageProperty('site'),
	...gitSourceProperties('site'),
	activateProperty('site', ['createDeployment', 'createTemplateDeployment', 'createVcsDeployment']),
	{
		displayName: 'Log ID',
		name: 'logId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the request log',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['deleteLog', 'getLog'],
			},
		},
	},
	...variableProperties('site'),
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The site name. Max length: 128 characters.',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Framework Name or ID',
		name: 'siteFramework',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getFrameworks' },
		required: true,
		default: '',
		description:
			'The framework the site is built with, e.g. nextjs or astro. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Build Runtime Name or ID',
		name: 'buildRuntime',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSiteBuildRuntimes',
			loadOptionsDependsOn: ['siteFramework'],
		},
		required: true,
		default: '',
		description:
			'The runtime the site is built with, e.g. node-22. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Site ID',
		name: 'siteId',
		type: 'string',
		default: '',
		description:
			'The ID for the site. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['create'],
			},
		},
	},
	...returnAllAndLimitProperties('site', [
		'getMany',
		'getManyDeployments',
		'getManyLogs',
		'getManyVariables',
	]),
	...queriesProperties('site', [
		'getMany',
		'getManyDeployments',
		'getManyLogs',
		'getManyVariables',
	]),
	simplifyProperty('site', [
		'get',
		'getDeployment',
		'getLog',
		'getMany',
		'getManyDeployments',
		'getManyLogs',
	]),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['create'],
			},
		},
		// Create sets the framework and build runtime on the node's face.
		options: siteConfigOptions.filter(
			(option) => option.name !== 'buildRuntime' && option.name !== 'siteFramework',
		),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['update'],
			},
		},
		options: siteConfigOptions,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['createDeployment'],
			},
		},
		options: [
			{
				displayName: 'Build Command',
				name: 'buildCommand',
				type: 'string',
				default: '',
				placeholder: 'e.g. npm run build',
				description:
					'The command that builds this deployment. Leave this option out to use the build command of the site.',
			},
			{
				displayName: 'Install Command',
				name: 'installCommand',
				type: 'string',
				default: '',
				placeholder: 'e.g. npm install',
				description:
					'The command that installs the dependencies of this deployment. Leave this option out to use the install command of the site.',
			},
			{
				displayName: 'Output Directory',
				name: 'outputDirectory',
				type: 'string',
				default: '',
				placeholder: 'e.g. ./dist',
				description:
					'The directory the build command writes this deployment to. Leave this option out to use the output directory of the site.',
			},
		],
	},
	listOptionsProperty('site', ['getMany', 'getManyDeployments']),
	...downloadDeploymentProperties('site'),
	specificationOptionsProperty('site'),
];
