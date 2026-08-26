import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { type TablesDB } from 'node-appwrite';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	getRowData,
	parseJsonArrayParameter,
	resolveId,
	toItems,
	withLimit,
} from '../GenericFunctions';

export async function executeRowOperation(
	this: IExecuteFunctions,
	tablesDB: TablesDB,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = this.getNodeParameter('databaseId', i) as string;
	const tableId = this.getNodeParameter('tableId', i) as string;
	const options = this.getNodeParameter('options', i, {}) as {
		transactionId?: string;
		min?: number;
		max?: number;
	};
	const transactionId = options.transactionId || undefined;

	if (operation === 'create') {
		const rowId = resolveId(this.getNodeParameter('rowId', i, '') as string);
		const data = getRowData.call(this, i);
		const permissions = getPermissions.call(this, i);
		const response = await tablesDB.createRow({
			databaseId,
			tableId,
			rowId,
			data,
			permissions,
			transactionId,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'createMany') {
		const rows = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('rowsJson', i),
			'rowsJson',
			i,
		) as object[];
		const response = await tablesDB.createRows({ databaseId, tableId, rows, transactionId });
		return toItems(response.rows as unknown as IDataObject[], i);
	}

	if (operation === 'get') {
		const rowId = this.getNodeParameter('rowId', i) as string;
		const queries = buildQueries.call(this, i);
		const response = await tablesDB.getRow({
			databaseId,
			tableId,
			rowId,
			queries: queries.length > 0 ? queries : undefined,
			transactionId,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const rows = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await tablesDB.listRows({
						databaseId,
						tableId,
						queries: pageQueries,
						transactionId,
					})) as unknown as IDataObject,
				'rows',
			);
			return toItems(rows as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await tablesDB.listRows({
			databaseId,
			tableId,
			queries: withLimit(queries, limit),
			transactionId,
		});
		return toItems(response.rows as unknown as IDataObject[], i);
	}

	if (operation === 'update') {
		const rowId = this.getNodeParameter('rowId', i) as string;
		const data = getRowData.call(this, i);
		const permissions = getPermissions.call(this, i);
		const response = await tablesDB.updateRow({
			databaseId,
			tableId,
			rowId,
			data,
			permissions,
			transactionId,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'updateMany') {
		const data = getRowData.call(this, i);
		const queries = buildQueries.call(this, i);
		const response = await tablesDB.updateRows({
			databaseId,
			tableId,
			data,
			queries: queries.length > 0 ? queries : undefined,
			transactionId,
		});
		return toItems(response.rows as unknown as IDataObject[], i);
	}

	if (operation === 'upsert') {
		const rowId = resolveId(this.getNodeParameter('rowId', i, '') as string);
		const data = getRowData.call(this, i);
		const permissions = getPermissions.call(this, i);
		const response = await tablesDB.upsertRow({
			databaseId,
			tableId,
			rowId,
			data,
			permissions,
			transactionId,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'upsertMany') {
		const rows = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('rowsJson', i),
			'rowsJson',
			i,
		) as object[];
		const response = await tablesDB.upsertRows({ databaseId, tableId, rows, transactionId });
		return toItems(response.rows as unknown as IDataObject[], i);
	}

	if (operation === 'delete') {
		const rowId = this.getNodeParameter('rowId', i) as string;
		await tablesDB.deleteRow({ databaseId, tableId, rowId, transactionId });
		return toItems({ success: true, rowId }, i);
	}

	if (operation === 'deleteMany') {
		const queries = buildQueries.call(this, i);
		const response = await tablesDB.deleteRows({
			databaseId,
			tableId,
			queries: queries.length > 0 ? queries : undefined,
			transactionId,
		});
		// One item per deleted row, matching Create/Update/Upsert Many.
		return toItems(response.rows as unknown as IDataObject[], i);
	}

	if (operation === 'increment') {
		const rowId = this.getNodeParameter('rowId', i) as string;
		const column = this.getNodeParameter('column', i) as string;
		const value = this.getNodeParameter('amount', i, 1) as number;
		const response = await tablesDB.incrementRowColumn({
			databaseId,
			tableId,
			rowId,
			column,
			value,
			max: options.max,
			transactionId,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'decrement') {
		const rowId = this.getNodeParameter('rowId', i) as string;
		const column = this.getNodeParameter('column', i) as string;
		const value = this.getNodeParameter('amount', i, 1) as number;
		const response = await tablesDB.decrementRowColumn({
			databaseId,
			tableId,
			rowId,
			column,
			value,
			min: options.min,
			transactionId,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown row operation "${operation}"`, {
		itemIndex: i,
	});
}
