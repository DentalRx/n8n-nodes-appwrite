import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { type Functions, type Models, type Runtime } from 'node-appwrite';

import {
	buildQueries,
	fetchAllPages,
	parseStringList,
	resolveId,
	toItems,
	withLimit,
} from '../GenericFunctions';

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

	const getConfigOptionArgs = (current?: Models.Function) => {
		const options = this.getNodeParameter('options', i, {}) as FunctionConfigOptions;
		// An option the user never added keeps whatever the function already has;
		// an option added and left blank clears it.
		const list = (raw: string | undefined, name: string, fallback?: string[]) =>
			raw === undefined ? fallback : parseStringList.call(this, raw, name, i);
		const text = (raw: string | undefined, fallback?: string) =>
			raw === undefined ? fallback : raw;

		return {
			execute: list(options.execute, 'execute', current?.execute),
			events: list(options.events, 'events', current?.events),
			schedule: text(options.schedule, current?.schedule),
			timeout: options.timeout ?? current?.timeout,
			enabled: options.enabled ?? current?.enabled,
			logging: options.logging ?? current?.logging,
			entrypoint: text(options.entrypoint, current?.entrypoint),
			commands: text(options.commands, current?.commands),
			scopes: list(options.scopes, 'scopes', current?.scopes),
		};
	};

	// The Runtime enum only enumerates the runtimes known at SDK release time and
	// grows with every Appwrite version; the raw runtime ID string is the wire
	// value, so casting keeps new runtimes usable without an SDK upgrade.
	const toRuntime = (runtimeId: string): Runtime => runtimeId as Runtime;

	if (operation === 'activateDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		const response = await functions.updateFunctionDeployment({ functionId, deploymentId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'create') {
		const rawId = this.getNodeParameter('functionId', i, '') as string;
		const newFunctionId = resolveId(rawId);
		const name = this.getNodeParameter('name', i) as string;
		const runtime = this.getNodeParameter('runtime', i) as string;
		const response = await functions.create({
			functionId: newFunctionId,
			name,
			runtime: toRuntime(runtime),
			...getConfigOptionArgs(),
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'createVariable') {
		const key = this.getNodeParameter('key', i) as string;
		const value = this.getNodeParameter('value', i) as string;
		const secret = this.getNodeParameter('secret', i, false) as boolean;
		const response = await functions.createVariable({ functionId, key, value, secret });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'delete') {
		await functions.delete({ functionId });
		return toItems({ success: true, functionId }, i);
	}

	if (operation === 'deleteDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		await functions.deleteDeployment({ functionId, deploymentId });
		return toItems({ success: true, functionId, deploymentId }, i);
	}

	if (operation === 'deleteVariable') {
		const variableId = this.getNodeParameter('variableId', i) as string;
		await functions.deleteVariable({ functionId, variableId });
		return toItems({ success: true, functionId, variableId }, i);
	}

	if (operation === 'get') {
		const response = await functions.get({ functionId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getDeployment') {
		const deploymentId = this.getNodeParameter('deploymentId', i) as string;
		const response = await functions.getDeployment({ functionId, deploymentId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const functionList = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await functions.list({
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'functions',
			);
			return toItems(functionList as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await functions.list({
			queries: withLimit(queries, limit),
			search: searchArg,
		});
		return toItems(response.functions as unknown as IDataObject[], i);
	}

	if (operation === 'getManyDeployments') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const deployments = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await functions.listDeployments({
						functionId,
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'deployments',
			);
			return toItems(deployments as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await functions.listDeployments({
			functionId,
			queries: withLimit(queries, limit),
			search: searchArg,
		});
		return toItems(response.deployments as unknown as IDataObject[], i);
	}

	if (operation === 'getManyVariables') {
		const response = await functions.listVariables({ functionId });
		return toItems(response.variables as unknown as IDataObject[], i);
	}

	if (operation === 'getVariable') {
		const variableId = this.getNodeParameter('variableId', i) as string;
		const response = await functions.getVariable({ functionId, variableId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'update') {
		const name = this.getNodeParameter('name', i) as string;
		const options = this.getNodeParameter('options', i, {}) as FunctionConfigOptions;
		const runtime = options.runtime === '' ? undefined : options.runtime;
		// Appwrite's function update is a full replace: settings left out of the
		// request are reset to the API's own defaults, which would silently clear
		// the schedule, event triggers, execute roles and the linked Git
		// repository. Read the function first and resend everything unchanged.
		const current = await functions.get({ functionId });
		const response = await functions.update({
			functionId,
			name,
			runtime: runtime === undefined ? undefined : toRuntime(runtime),
			...getConfigOptionArgs(current),
			installationId: current.installationId,
			providerRepositoryId: current.providerRepositoryId,
			providerBranch: current.providerBranch,
			providerSilentMode: current.providerSilentMode,
			providerRootDirectory: current.providerRootDirectory,
			specification: current.specification,
		});
		return toItems(response as unknown as IDataObject, i);
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
			secret,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown function operation "${operation}"`, {
		itemIndex: i,
	});
}
