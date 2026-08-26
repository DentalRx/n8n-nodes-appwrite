import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	getRowData,
	parseJsonArrayParameter,
} from '../GenericFunctions';
import { Query, extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeRowOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = extractId(this.getNodeParameter('databaseId', i) as string, 'database');
	const tableId = extractId(this.getNodeParameter('tableId', i) as string, 'table');
	const options = this.getNodeParameter('options', i, {}) as {
		transactionId?: string;
		min?: number;
		max?: number;
	};
	const transactionId = options.transactionId || undefined;

	const rowsPath = `/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableId)}/rows`;

	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	if (operation === 'create') {
		const rowId = resolveId(this.getNodeParameter('rowId', i, '') as string);
		const data = getRowData.call(this, i);
		const permissions = getPermissions.call(this, i);
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			rowsPath,
			{ body: { rowId, data, permissions, transactionId } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'createMany') {
		const rows = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('rowsJson', i),
			'rowsJson',
			i,
		) as IDataObject[];
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			rowsPath,
			{ body: { rows, transactionId } },
			i,
		)) as IDataObject;
		return toItems(response.rows as IDataObject[]);
	}

	if (operation === 'get') {
		const rowId = extractId(this.getNodeParameter('rowId', i) as string, 'row');
		const queries = buildQueries.call(this, i);
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`${rowsPath}/${encodeURIComponent(rowId)}`,
			{
				qs: {
					queries: queries.length > 0 ? queries : undefined,
					transactionId,
				},
			},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const rows = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await appwriteApiRequest.call(
						this,
						'GET',
						rowsPath,
						{ qs: { queries: pageQueries, transactionId } },
						i,
					)) as IDataObject,
				'rows',
			);
			return toItems(rows as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const hasLimit = queries.some((q) => {
			try {
				return (JSON.parse(q) as { method?: string }).method === 'limit';
			} catch {
				return false;
			}
		});
		const finalQueries = hasLimit ? queries : [...queries, Query.limit(limit)];
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			rowsPath,
			{ qs: { queries: finalQueries, transactionId } },
			i,
		)) as IDataObject;
		return toItems(response.rows as IDataObject[]);
	}

	if (operation === 'update') {
		const rowId = extractId(this.getNodeParameter('rowId', i) as string, 'row');
		const data = getRowData.call(this, i);
		const permissions = getPermissions.call(this, i);
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${rowsPath}/${encodeURIComponent(rowId)}`,
			{ body: { data, permissions, transactionId } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'updateMany') {
		const data = getRowData.call(this, i);
		const queries = buildQueries.call(this, i);
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			rowsPath,
			{
				body: {
					data,
					queries: queries.length > 0 ? queries : undefined,
					transactionId,
				},
			},
			i,
		)) as IDataObject;
		return toItems(response.rows as IDataObject[]);
	}

	if (operation === 'upsert') {
		const rowId = resolveId(this.getNodeParameter('rowId', i, '') as string);
		const data = getRowData.call(this, i);
		const permissions = getPermissions.call(this, i);
		const response = (await appwriteApiRequest.call(
			this,
			'PUT',
			`${rowsPath}/${encodeURIComponent(rowId)}`,
			{ body: { data, permissions, transactionId } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'upsertMany') {
		const rows = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('rowsJson', i),
			'rowsJson',
			i,
		) as IDataObject[];
		const response = (await appwriteApiRequest.call(
			this,
			'PUT',
			rowsPath,
			{ body: { rows, transactionId } },
			i,
		)) as IDataObject;
		return toItems(response.rows as IDataObject[]);
	}

	if (operation === 'delete') {
		const rowId = extractId(this.getNodeParameter('rowId', i) as string, 'row');
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${rowsPath}/${encodeURIComponent(rowId)}`,
			{ body: { transactionId } },
			i,
		);
		return toItems({ success: true, rowId });
	}

	if (operation === 'deleteMany') {
		const queries = buildQueries.call(this, i);
		const response = (await appwriteApiRequest.call(
			this,
			'DELETE',
			rowsPath,
			{
				body: {
					queries: queries.length > 0 ? queries : undefined,
					transactionId,
				},
			},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'increment') {
		const rowId = extractId(this.getNodeParameter('rowId', i) as string, 'row');
		const column = this.getNodeParameter('column', i) as string;
		const value = this.getNodeParameter('amount', i, 1) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${rowsPath}/${encodeURIComponent(rowId)}/${encodeURIComponent(column)}/increment`,
			{ body: { value, max: options.max, transactionId } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'decrement') {
		const rowId = extractId(this.getNodeParameter('rowId', i) as string, 'row');
		const column = this.getNodeParameter('column', i) as string;
		const value = this.getNodeParameter('amount', i, 1) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${rowsPath}/${encodeURIComponent(rowId)}/${encodeURIComponent(column)}/decrement`,
			{ body: { value, min: options.min, transactionId } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	throw new NodeOperationError(this.getNode(), `Unknown row operation "${operation}"`, {
		itemIndex: i,
	});
}
