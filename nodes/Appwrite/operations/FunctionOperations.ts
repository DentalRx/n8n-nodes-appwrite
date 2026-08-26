import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ID, Query, type Functions, type Runtime } from 'node-appwrite';

import { buildQueries, fetchAllPages, parseJsonArrayParameter } from '../GenericFunctions';

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
	functions: Functions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const functionId = this.getNodeParameter('functionId', i, '') as string;

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

	// The Runtime enum only enumerates the runtimes known at SDK release time and
	// grows with every Appwrite version; the raw runtime ID string is the wire
	// value, so casting keeps new runtimes usable without an SDK upgrade.
	const toRuntime = (runtimeId: string): Runtime => runtimeId as Runtime;

	if (operation === 'activateDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		const response = await functions.updateFunctionDeployment({ functionId, deploymentId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'create') {
		const rawId = this.getNodeParameter('functionId', i, '') as string;
		const newFunctionId = rawId === '' || rawId === 'unique()' ? ID.unique() : rawId;
		const name = this.getNodeParameter('name', i) as string;
		const runtime = this.getNodeParameter('runtime', i) as string;
		const response = await functions.create({
			functionId: newFunctionId,
			name,
			runtime: toRuntime(runtime),
			...getConfigOptionArgs(),
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'createVariable') {
		const key = this.getNodeParameter('key', i) as string;
		const value = this.getNodeParameter('value', i) as string;
		const secret = this.getNodeParameter('secret', i, false) as boolean;
		const response = await functions.createVariable({ functionId, key, value, secret });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'delete') {
		await functions.delete({ functionId });
		return toItems({ success: true, functionId });
	}

	if (operation === 'deleteDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		await functions.deleteDeployment({ functionId, deploymentId });
		return toItems({ success: true, functionId, deploymentId });
	}

	if (operation === 'deleteVariable') {
		const variableId = this.getNodeParameter('variableId', i) as string;
		await functions.deleteVariable({ functionId, variableId });
		return toItems({ success: true, functionId, variableId });
	}

	if (operation === 'get') {
		const response = await functions.get({ functionId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		const response = await functions.getDeployment({ functionId, deploymentId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const functionList = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await functions.list({
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'functions',
			);
			return toItems(functionList as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await functions.list({
			queries: [...queries, Query.limit(limit)],
			search: searchArg,
		});
		return toItems(response.functions as unknown as IDataObject[]);
	}

	if (operation === 'getManyDeployments') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const deployments = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await functions.listDeployments({
						functionId,
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'deployments',
			);
			return toItems(deployments as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await functions.listDeployments({
			functionId,
			queries: [...queries, Query.limit(limit)],
			search: searchArg,
		});
		return toItems(response.deployments as unknown as IDataObject[]);
	}

	if (operation === 'getManyVariables') {
		const response = await functions.listVariables({ functionId });
		return toItems(response.variables as unknown as IDataObject[]);
	}

	if (operation === 'getVariable') {
		const variableId = this.getNodeParameter('variableId', i) as string;
		const response = await functions.getVariable({ functionId, variableId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'update') {
		const name = this.getNodeParameter('name', i) as string;
		const options = this.getNodeParameter('options', i, {}) as FunctionConfigOptions;
		const runtime = options.runtime === '' ? undefined : options.runtime;
		const response = await functions.update({
			functionId,
			name,
			runtime: runtime === undefined ? undefined : toRuntime(runtime),
			...getConfigOptionArgs(),
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'updateVariable') {
		const variableId = this.getNodeParameter('variableId', i) as string;
		const key = this.getNodeParameter('key', i) as string;
		const value = this.getNodeParameter('value', i, '') as string;
		const secret = this.getNodeParameter('secret', i, false) as boolean;
		const response = await functions.updateVariable({
			functionId,
			variableId,
			key,
			value: value === '' ? undefined : value,
			secret: secret ? true : undefined,
		});
		return toItems(response as unknown as IDataObject);
	}

	throw new NodeOperationError(this.getNode(), `Unknown function operation "${operation}"`, {
		itemIndex: i,
	});
}
