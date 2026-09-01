import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	getRowData,
	getSortQueries,
	parseJsonArrayParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { extractId, resolveId } from '../helpers/appwrite';
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

	if (operation === 'create') {
		const rowId = resolveId(this.getNodeParameter('rowId', i, '') as string);
		const data = getRowData.call(this, i);
		const permissions = getPermissions.call(this, i);
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			rowsPath,
			{ body: { rowId, data, permissions, transactionId } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createMany') {
		const rows = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('rowsJson', i),
			'Rows (JSON)',
			i,
		) as IDataObject[];
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			rowsPath,
			{ body: { rows, transactionId } },
			i,
		);
		return toItems(response.rows as IDataObject[], i);
	}

	if (operation === 'get') {
		const rowId = extractId(this.getNodeParameter('rowId', i) as string, 'row');
		const queries = buildQueries.call(this, i);
		const response = await appwriteApiRequest.call(
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
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = [...buildQueries.call(this, i), ...getSortQueries.call(this, i)];

		if (returnAll) {
			const rows = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						rowsPath,
						{ qs: { queries: pageQueries, transactionId } },
						i,
					),
				'rows',
				i,
			);
			return toItems(rows as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const finalQueries = withLimit(queries, limit);
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			rowsPath,
			{ qs: { queries: finalQueries, transactionId } },
			i,
		);
		return toItems(response.rows as IDataObject[], i);
	}

	if (operation === 'update') {
		const rowId = extractId(this.getNodeParameter('rowId', i) as string, 'row');
		const data = getRowData.call(this, i);
		const permissions = getPermissions.call(this, i);
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${rowsPath}/${encodeURIComponent(rowId)}`,
			{ body: { data, permissions, transactionId } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateMany') {
		const data = getRowData.call(this, i);
		const queries = buildQueries.call(this, i);
		const response = await appwriteApiRequest.call(
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
		);
		return toItems(response.rows as IDataObject[], i);
	}

	if (operation === 'upsert') {
		const rowId = resolveId(this.getNodeParameter('rowId', i, '') as string);
		const data = getRowData.call(this, i);
		const permissions = getPermissions.call(this, i);
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`${rowsPath}/${encodeURIComponent(rowId)}`,
			{ body: { data, permissions, transactionId } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'upsertMany') {
		const rows = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('rowsJson', i),
			'Rows (JSON)',
			i,
		) as IDataObject[];
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			rowsPath,
			{ body: { rows, transactionId } },
			i,
		);
		return toItems(response.rows as IDataObject[], i);
	}

	if (operation === 'delete') {
		const rowId = extractId(this.getNodeParameter('rowId', i) as string, 'row');
		// The spec declares transactionId a query-string parameter on DELETE.
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${rowsPath}/${encodeURIComponent(rowId)}`,
			{ qs: { transactionId } },
			i,
		);
		return toItems({ deleted: true, rowId }, i);
	}

	if (operation === 'deleteMany') {
		const queries = buildQueries.call(this, i);
		// The spec declares queries and transactionId query-string parameters on
		// DELETE, unlike the update/upsert bodies.
		const response = await appwriteApiRequest.call(
			this,
			'DELETE',
			rowsPath,
			{
				qs: {
					queries: queries.length > 0 ? queries : undefined,
					transactionId,
				},
			},
			i,
		);
		// One item per deleted row, matching Create/Update/Upsert Many.
		return toItems(response.rows as IDataObject[], i);
	}

	if (operation === 'increment') {
		const rowId = extractId(this.getNodeParameter('rowId', i) as string, 'row');
		const column = this.getNodeParameter('column', i) as string;
		const value = this.getNodeParameter('amount', i, 1) as number;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${rowsPath}/${encodeURIComponent(rowId)}/${encodeURIComponent(column)}/increment`,
			{ body: { value, max: options.max, transactionId } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'decrement') {
		const rowId = extractId(this.getNodeParameter('rowId', i) as string, 'row');
		const column = this.getNodeParameter('column', i) as string;
		const value = this.getNodeParameter('amount', i, 1) as number;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${rowsPath}/${encodeURIComponent(rowId)}/${encodeURIComponent(column)}/decrement`,
			{ body: { value, min: options.min, transactionId } },
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown row operation "${operation}"`, {
		itemIndex: i,
	});
}
