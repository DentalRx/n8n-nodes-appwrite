import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	parseStringList,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** The function-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'runtime',
	'enabled',
	'live',
	'deploymentId',
	'schedule',
	'timeout',
	'events',
	'entrypoint',
];

interface FunctionConfigOptions {
	commands?: string;
	enabled?: boolean;
	entrypoint?: string;
	events?: string;
	execute?: string;
	logging?: boolean;
	runtime?: string;
	schedule?: string;
	scopes?: string;
	timeout?: number;
}

export async function executeFunctionOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const functionId = extractId(this.getNodeParameter('functionId', i, '') as string, 'function');

	const getConfigOptionArgs = (current?: IDataObject): IDataObject => {
		const options = this.getNodeParameter('options', i, {}) as FunctionConfigOptions;
		// An option the user never added keeps whatever the function already has
		// (`current` is set on update only); an option added and left blank clears it.
		const list = (raw: string | undefined, name: string, key: string) =>
			raw === undefined
				? (current?.[key] as string[] | undefined)
				: parseStringList.call(this, raw, name, i);
		const text = (raw: string | undefined, key: string) =>
			raw === undefined ? (current?.[key] as string | undefined) : raw;

		return {
			execute: list(options.execute, 'Execute Access', 'execute'),
			events: list(options.events, 'Events', 'events'),
			schedule: text(options.schedule, 'schedule'),
			timeout: options.timeout ?? (current?.timeout as number | undefined),
			enabled: options.enabled ?? (current?.enabled as boolean | undefined),
			logging: options.logging ?? (current?.logging as boolean | undefined),
			entrypoint: text(options.entrypoint, 'entrypoint'),
			commands: text(options.commands, 'commands'),
			scopes: list(options.scopes, 'Scopes', 'scopes'),
		};
	};

	if (operation === 'activateDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/functions/${encodeURIComponent(functionId)}/deployment`,
			{ body: { deploymentId } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'create') {
		const newFunctionId = resolveId(this.getNodeParameter('functionId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		// The raw runtime ID string is the wire value, so it is passed through
		// as-is: Appwrite adds runtimes with every release and the node must not
		// restrict them to a fixed list.
		const runtime = this.getNodeParameter('runtime', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/functions',
			{ body: { functionId: newFunctionId, name, runtime, ...getConfigOptionArgs() } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createVariable') {
		const variableId = resolveId(this.getNodeParameter('variableId', i, '') as string);
		const key = this.getNodeParameter('key', i) as string;
		const value = this.getNodeParameter('value', i) as string;
		const secret = this.getNodeParameter('secret', i, false) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`/functions/${encodeURIComponent(functionId)}/variables`,
			{ body: { variableId, key, value, secret } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/functions/${encodeURIComponent(functionId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, functionId }, i);
	}

	if (operation === 'deleteDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/functions/${encodeURIComponent(functionId)}/deployments/${encodeURIComponent(deploymentId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, functionId, deploymentId }, i);
	}

	if (operation === 'deleteVariable') {
		const variableId = this.getNodeParameter('variableId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/functions/${encodeURIComponent(functionId)}/variables/${encodeURIComponent(variableId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, functionId, variableId }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}`,
			{},
			i,
		);
		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		return toItems(simplify ? simplifyItems(response, SIMPLIFY_FIELDS) : response, i);
	}

	if (operation === 'getDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}/deployments/${encodeURIComponent(deploymentId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		const project = (functionList: IDataObject[]) =>
			simplify ? (simplifyItems(functionList, SIMPLIFY_FIELDS) as IDataObject[]) : functionList;

		if (returnAll) {
			const functionList = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/functions',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'functions',
				i,
			);
			return toItems(project(functionList as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/functions',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(project(response.functions as IDataObject[]), i);
	}

	if (operation === 'getManyDeployments') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const deployments = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						`/functions/${encodeURIComponent(functionId)}/deployments`,
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'deployments',
				i,
			);
			return toItems(deployments as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}/deployments`,
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(response.deployments as IDataObject[], i);
	}

	if (operation === 'getManyVariables') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}/variables`,
			{},
			i,
		);
		return toItems(response.variables as IDataObject[], i);
	}

	if (operation === 'getVariable') {
		const variableId = this.getNodeParameter('variableId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}/variables/${encodeURIComponent(variableId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'update') {
		const name = this.getNodeParameter('name', i) as string;
		const options = this.getNodeParameter('options', i, {}) as FunctionConfigOptions;
		// PUT /functions/{id} is a full replace: any field left out of the body is
		// reset to the API's own default rather than kept, which would silently
		// clear the schedule, event triggers, execute roles and the linked Git
		// repository. Read the function first and resend everything unchanged.
		const current = await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}`,
			{},
			i,
		);
		const runtime =
			options.runtime === '' || options.runtime === undefined
				? (current.runtime as string | undefined)
				: options.runtime;
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`/functions/${encodeURIComponent(functionId)}`,
			{
				body: {
					name,
					runtime,
					...getConfigOptionArgs(current),
					// Not exposed by the node, but omitting them would disconnect the
					// function from its repository or reset its compute, build and
					// deployment-retention configuration.
					installationId: current.installationId,
					providerRepositoryId: current.providerRepositoryId,
					providerBranch: current.providerBranch,
					providerBranches: current.providerBranches,
					providerPaths: current.providerPaths,
					providerSilentMode: current.providerSilentMode,
					providerRootDirectory: current.providerRootDirectory,
					runtimeSpecification: current.runtimeSpecification,
					buildSpecification: current.buildSpecification,
					deploymentRetention: current.deploymentRetention,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateVariable') {
		const variableId = this.getNodeParameter('variableId', i) as string;
		const key = this.getNodeParameter('key', i) as string;
		const value = this.getNodeParameter('value', i, '') as string;
		const secret = this.getNodeParameter('secret', i, false) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`/functions/${encodeURIComponent(functionId)}/variables/${encodeURIComponent(variableId)}`,
			{
				body: {
					key,
					value: value === '' ? undefined : value,
					// `secret` is one-way in Appwrite: once set it cannot be turned back
					// off, and omitting it keeps the variable's current setting - which
					// is what an untouched toggle promises in the UI.
					secret: secret ? true : undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown function operation "${operation}"`, {
		itemIndex: i,
	});
}
