import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildQueries, fetchAllPages, parseJsonArrayParameter } from '../GenericFunctions';
import { Query, extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

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

	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	const parseList = (raw: string, name: string): string[] => {
		if (raw.trim() === '') return [];
		if (raw.trim().startsWith('[')) {
			return parseJsonArrayParameter.call(this, raw, name, i).map((e) => String(e));
		}
		return raw
			.split(',')
			.map((e) => e.trim())
			.filter((e) => e !== '');
	};

	const getConfigOptionArgs = () => {
		const options = this.getNodeParameter('options', i, {}) as FunctionConfigOptions;
		const execute = parseList(options.execute ?? '', 'execute');
		const events = parseList(options.events ?? '', 'events');
		const scopes = parseList(options.scopes ?? '', 'scopes');
		return {
			execute: execute.length > 0 ? execute : undefined,
			events: events.length > 0 ? events : undefined,
			schedule: options.schedule === '' ? undefined : options.schedule,
			timeout: options.timeout,
			enabled: options.enabled,
			logging: options.logging,
			entrypoint: options.entrypoint === '' ? undefined : options.entrypoint,
			commands: options.commands === '' ? undefined : options.commands,
			scopes: scopes.length > 0 ? scopes : undefined,
		};
	};

	if (operation === 'activateDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`/functions/${encodeURIComponent(functionId)}/deployment`,
			{ body: { deploymentId } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'create') {
		const newFunctionId = resolveId(this.getNodeParameter('functionId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		// The raw runtime ID string is the wire value, so it is passed through
		// as-is: Appwrite adds runtimes with every release and the node must not
		// restrict them to a fixed list.
		const runtime = this.getNodeParameter('runtime', i) as string;
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			'/functions',
			{ body: { functionId: newFunctionId, name, runtime, ...getConfigOptionArgs() } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'createVariable') {
		const key = this.getNodeParameter('key', i) as string;
		const value = this.getNodeParameter('value', i) as string;
		const secret = this.getNodeParameter('secret', i, false) as boolean;
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			`/functions/${encodeURIComponent(functionId)}/variables`,
			{ body: { key, value, secret } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'delete') {
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/functions/${encodeURIComponent(functionId)}`,
			{},
			i,
		);
		return toItems({ success: true, functionId });
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
		return toItems({ success: true, functionId, deploymentId });
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
		return toItems({ success: true, functionId, variableId });
	}

	if (operation === 'get') {
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}`,
			{},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'getDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}/deployments/${encodeURIComponent(deploymentId)}`,
			{},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const functionList = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					(await appwriteApiRequest.call(
						this,
						'GET',
						'/functions',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					)) as IDataObject,
				'functions',
			);
			return toItems(functionList as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			'/functions',
			{ qs: { queries: [...queries, Query.limit(limit)], search: searchArg } },
			i,
		)) as IDataObject;
		return toItems(response.functions as IDataObject[]);
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
					(await appwriteApiRequest.call(
						this,
						'GET',
						`/functions/${encodeURIComponent(functionId)}/deployments`,
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					)) as IDataObject,
				'deployments',
			);
			return toItems(deployments as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}/deployments`,
			{ qs: { queries: [...queries, Query.limit(limit)], search: searchArg } },
			i,
		)) as IDataObject;
		return toItems(response.deployments as IDataObject[]);
	}

	if (operation === 'getManyVariables') {
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}/variables`,
			{},
			i,
		)) as IDataObject;
		return toItems(response.variables as IDataObject[]);
	}

	if (operation === 'getVariable') {
		const variableId = this.getNodeParameter('variableId', i) as string;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`/functions/${encodeURIComponent(functionId)}/variables/${encodeURIComponent(variableId)}`,
			{},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'update') {
		const name = this.getNodeParameter('name', i) as string;
		const options = this.getNodeParameter('options', i, {}) as FunctionConfigOptions;
		const runtime = options.runtime === '' ? undefined : options.runtime;
		const response = (await appwriteApiRequest.call(
			this,
			'PUT',
			`/functions/${encodeURIComponent(functionId)}`,
			{ body: { name, runtime, ...getConfigOptionArgs() } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'updateVariable') {
		const variableId = this.getNodeParameter('variableId', i) as string;
		const key = this.getNodeParameter('key', i) as string;
		const value = this.getNodeParameter('value', i, '') as string;
		const secret = this.getNodeParameter('secret', i, false) as boolean;
		const response = (await appwriteApiRequest.call(
			this,
			'PUT',
			`/functions/${encodeURIComponent(functionId)}/variables/${encodeURIComponent(variableId)}`,
			{
				body: {
					key,
					value: value === '' ? undefined : value,
					secret: secret ? true : undefined,
				},
			},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	throw new NodeOperationError(this.getNode(), `Unknown function operation "${operation}"`, {
		itemIndex: i,
	});
}
