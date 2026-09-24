import type { INodeProperties } from 'n8n-workflow';

/**
 * Fields shared by the Function and Site resources. Both are Appwrite compute
 * resources: their deployments, environment variables and compute
 * specifications are served by endpoints of the same shape under
 * `/functions/{functionId}` and `/sites/{siteId}`, so both resources build
 * those fields here and differ only in wording. `resource` is the resource
 * value (`function` or `site`), which doubles as the noun in the copy.
 */

const show = (resource: string, operations: string[]) => ({
	show: { resource: [resource], operation: operations },
});

/** The Deployment ID of the operations that act on one existing deployment. */
export function deploymentIdProperty(
	resource: string,
	operations: string[],
	description = 'The ID of the code deployment',
): INodeProperties {
	return {
		displayName: 'Deployment ID',
		name: 'deploymentId',
		type: 'string',
		required: true,
		default: '',
		description,
		displayOptions: show(resource, operations),
	};
}

/** The binary input of Create Deployment. */
export function codePackageProperty(resource: string): INodeProperties {
	return {
		displayName: 'Input Data Field Name',
		name: 'inputBinaryField',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the input field holding the code package, a .tar.gz archive',
		displayOptions: show(resource, ['createDeployment']),
	};
}

/** The Activate toggle of the operations that start a new build. */
export function activateProperty(resource: string, operations: string[]): INodeProperties {
	return {
		displayName: 'Activate',
		name: 'activate',
		type: 'boolean',
		default: false,
		description: `Whether to make this the ${resource}'s active deployment once it has finished building`,
		displayOptions: show(resource, operations),
	};
}

/** Where Create Template Deployment and Create VCS Deployment take their code from. */
export function gitSourceProperties(resource: string): INodeProperties[] {
	return [
		{
			displayName: 'Repository Owner',
			name: 'templateOwner',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. appwrite',
			description: 'The GitHub user or organization that owns the template repository',
			displayOptions: show(resource, ['createTemplateDeployment']),
		},
		{
			displayName: 'Repository Name',
			name: 'templateRepository',
			type: 'string',
			required: true,
			default: '',
			placeholder: resource === 'site' ? 'e.g. templates-for-sites' : 'e.g. templates',
			description: 'The name of the template repository',
			displayOptions: show(resource, ['createTemplateDeployment']),
		},
		{
			displayName: 'Root Directory',
			name: 'templateRootDirectory',
			type: 'string',
			required: true,
			default: '',
			placeholder: resource === 'site' ? 'e.g. nextjs/starter' : 'e.g. node/starter',
			description: `The path to the ${resource} code inside the template repository`,
			displayOptions: show(resource, ['createTemplateDeployment']),
		},
		{
			displayName: 'Reference Type',
			name: 'gitReferenceType',
			type: 'options',
			options: [
				{ name: 'Branch', value: 'branch' },
				{ name: 'Commit', value: 'commit' },
				{ name: 'Tag', value: 'tag' },
			],
			default: 'branch',
			description: 'The kind of Git reference to deploy',
			displayOptions: show(resource, ['createTemplateDeployment']),
		},
		{
			displayName: 'Reference Type',
			name: 'gitReferenceType',
			type: 'options',
			options: [
				{ name: 'Branch', value: 'branch' },
				{ name: 'Commit', value: 'commit' },
			],
			default: 'branch',
			description: 'The kind of Git reference to deploy',
			displayOptions: show(resource, ['createVcsDeployment']),
		},
		{
			displayName: 'Reference',
			name: 'gitReference',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. main',
			description: 'The branch name, commit hash, or tag to deploy',
			displayOptions: show(resource, ['createTemplateDeployment']),
		},
		{
			displayName: 'Reference',
			name: 'gitReference',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. main',
			description: `The branch name or commit hash to deploy from the Git repository connected to the ${resource}`,
			displayOptions: show(resource, ['createVcsDeployment']),
		},
	];
}

/** The binary output and options of Download Deployment. */
export function downloadDeploymentProperties(resource: string): INodeProperties[] {
	return [
		{
			displayName: 'Output Data Field Name',
			name: 'outputBinaryField',
			type: 'string',
			required: true,
			default: 'data',
			hint: 'The name of the output field to put the file in',
			displayOptions: show(resource, ['downloadDeployment']),
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: show(resource, ['downloadDeployment']),
			options: [
				{
					displayName: 'Content',
					name: 'deploymentContent',
					type: 'options',
					options: [
						{
							name: 'Build Output',
							value: 'output',
							description: 'The files the build of the deployment produced',
						},
						{
							name: 'Source Code',
							value: 'source',
							description: 'The code package the deployment was created from',
						},
					],
					default: 'source',
					description: 'Which files of the deployment to download',
				},
			],
		},
	];
}

/** The options of Get Many Specifications. */
export function specificationOptionsProperty(resource: string): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show(resource, ['getManySpecifications']),
		options: [
			{
				displayName: 'Type',
				name: 'specificationType',
				type: 'options',
				options: [
					{
						name: 'Build',
						value: 'builds',
						description: 'The sizes available for building deployments',
					},
					{
						name: 'Runtime',
						value: 'runtimes',
						description:
							resource === 'site'
								? 'The sizes available for server-side rendering'
								: 'The sizes available for running executions',
					},
				],
				default: 'runtimes',
				description: 'Which kind of compute sizes to list',
			},
		],
	};
}

/** The fields of the environment variable operations. */
export function variableProperties(resource: string): INodeProperties[] {
	return [
		{
			displayName: 'Variable ID',
			name: 'variableId',
			type: 'string',
			required: true,
			default: '',
			description: 'The ID of the environment variable',
			displayOptions: show(resource, ['deleteVariable', 'getVariable', 'updateVariable']),
		},
		{
			displayName: 'Variable ID',
			name: 'variableId',
			type: 'string',
			default: '',
			placeholder: 'unique()',
			description:
				'The ID for the new environment variable. Leave empty (or use unique()) to auto-generate a unique ID.',
			displayOptions: show(resource, ['createVariable']),
		},
		{
			displayName: 'Key',
			name: 'key',
			type: 'string',
			required: true,
			default: '',
			description: 'The variable key (environment variable name). Max length: 255 characters.',
			displayOptions: show(resource, ['createVariable', 'updateVariable']),
		},
		{
			displayName: 'Value',
			name: 'value',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'The variable value. Max length: 8192 characters.',
			displayOptions: show(resource, ['createVariable']),
		},
		{
			displayName: 'Value',
			name: 'value',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'The new variable value. Leave empty to keep the current value. Max length: 8192 characters.',
			displayOptions: show(resource, ['updateVariable']),
		},
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'boolean',
			default: false,
			description: `Whether the variable is secret. Secret variables can be updated or deleted, but only ${resource}s can read them during build and runtime, and a variable cannot be made readable again once it is secret. When updating, leaving this off keeps the existing setting.`,
			displayOptions: show(resource, ['createVariable', 'updateVariable']),
		},
	];
}
