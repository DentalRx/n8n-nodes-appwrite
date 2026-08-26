import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ExecutionMethod, type Functions } from 'node-appwrite';

import {
	buildQueries,
	fetchAllPages,
	lookupEnum,
	parseJsonParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';

const EXECUTION_METHOD_MAP: Record<string, ExecutionMethod> = {
	DELETE: ExecutionMethod.DELETE,
	GET: ExecutionMethod.GET,
	HEAD: ExecutionMethod.HEAD,
	OPTIONS: ExecutionMethod.OPTIONS,
	PATCH: ExecutionMethod.PATCH,
	POST: ExecutionMethod.POST,
	PUT: ExecutionMethod.PUT,
};

interface ExecutionCreateOptions {
	headers?: string | IDataObject;
	method?: string;
	scheduledAt?: string;
	xpath?: string;
}

export async function executeExecutionOperation(
	this: IExecuteFunctions,
	functions: Functions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const functionId = this.getNodeParameter('functionId', i) as string;

	if (operation === 'create') {
		const body = this.getNodeParameter('body', i, '') as string;
		const async = this.getNodeParameter('async', i, false) as boolean;
		const options = this.getNodeParameter('options', i, {}) as ExecutionCreateOptions;
		const headers =
			options.headers === undefined
				? undefined
				: parseJsonParameter.call(this, options.headers, 'headers', i);
		const response = await functions.createExecution({
			functionId,
			body: body === '' ? undefined : body,
			async,
			xpath: options.xpath === '' ? undefined : options.xpath,
			method: options.method
				? lookupEnum(this, EXECUTION_METHOD_MAP, options.method, 'HTTP method', i)
				: undefined,
			headers: headers && Object.keys(headers).length > 0 ? headers : undefined,
			scheduledAt: options.scheduledAt === '' ? undefined : options.scheduledAt,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'delete') {
		const executionId = this.getNodeParameter('executionId', i) as string;
		await functions.deleteExecution({ functionId, executionId });
		return toItems({ success: true, functionId, executionId }, i);
	}

	if (operation === 'get') {
		const executionId = this.getNodeParameter('executionId', i) as string;
		const response = await functions.getExecution({ functionId, executionId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const executions = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await functions.listExecutions({
						functionId,
						queries: pageQueries,
					})) as unknown as IDataObject,
				'executions',
			);
			return toItems(executions as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await functions.listExecutions({
			functionId,
			queries: withLimit(queries, limit),
		});
		return toItems(response.executions as unknown as IDataObject[], i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown execution operation "${operation}"`, {
		itemIndex: i,
	});
}
