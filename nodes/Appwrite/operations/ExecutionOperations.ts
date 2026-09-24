import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getResourceId,
	lookupEnum,
	parseJsonParameter,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';
import { EXECUTION_SIMPLIFY_FIELDS } from './compute';

/** The HTTP methods an execution can be triggered with. */
const EXECUTION_METHOD_MAP: Record<string, string> = {
	DELETE: 'DELETE',
	GET: 'GET',
	HEAD: 'HEAD',
	OPTIONS: 'OPTIONS',
	PATCH: 'PATCH',
	POST: 'POST',
	PUT: 'PUT',
};

interface ExecutionCreateOptions {
	headers?: string | IDataObject;
	method?: string;
	scheduledAt?: string;
	xpath?: string;
}

export async function executeExecutionOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const functionId = getResourceId.call(this, 'functionId', i, 'function', 'Function');
	const executionsPath = `/functions/${encodeURIComponent(functionId)}/executions`;
	const simplified = (data: IDataObject | IDataObject[]) =>
		(this.getNodeParameter('simplify', i, false) as boolean)
			? simplifyItems(data, EXECUTION_SIMPLIFY_FIELDS)
			: data;

	if (operation === 'create') {
		const body = this.getNodeParameter('body', i, '') as string;
		const async = this.getNodeParameter('async', i, false) as boolean;
		const options = this.getNodeParameter('options', i, {}) as ExecutionCreateOptions;
		const headers =
			options.headers === undefined
				? undefined
				: parseJsonParameter.call(this, options.headers, 'Headers', i);

		const response = await appwriteApiRequest.call(
			this,
			'POST',
			executionsPath,
			{
				body: {
					body: body === '' ? undefined : body,
					async,
					// The UI calls this "Path"; Appwrite takes it as the `path` field.
					path: options.xpath === '' ? undefined : options.xpath,
					method: options.method
						? lookupEnum(this, EXECUTION_METHOD_MAP, options.method, 'HTTP method', i)
						: undefined,
					headers: headers && Object.keys(headers).length > 0 ? headers : undefined,
					scheduledAt: options.scheduledAt === '' ? undefined : options.scheduledAt,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const executionId = this.getNodeParameter('executionId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${executionsPath}/${encodeURIComponent(executionId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, functionId, executionId }, i);
	}

	if (operation === 'get') {
		const executionId = this.getNodeParameter('executionId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${executionsPath}/${encodeURIComponent(executionId)}`,
			{},
			i,
		);
		return toItems(simplified(response), i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const executions = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						executionsPath,
						{ qs: { queries: pageQueries } },
						i,
					),
				'executions',
				i,
			);
			return toItems(simplified(executions as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			executionsPath,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(simplified(response.executions as IDataObject[]), i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown execution operation "${operation}"`, {
		itemIndex: i,
	});
}
