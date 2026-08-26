import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ID, Query, type TablesDB } from 'node-appwrite';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	getRowData,
	parseJsonArrayParameter,
} from '../GenericFunctions';

function resolveRowId(rawId: string): string {
	return rawId === '' || rawId === 'unique()' ? ID.unique() : rawId;
}

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

	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	if (operation === 'create') {
		const rowId = resolveRowId(this.getNodeParameter('rowId', i, '') as string);
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
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'createMany') {
		const rows = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('rowsJson', i),
			'rowsJson',
			i,
		) as object[];
		const response = await tablesDB.createRows({ databaseId, tableId, rows, transactionId });
		return toItems(response.rows as unknown as IDataObject[]);
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
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const rows = await fetchAllPages(
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
			return toItems(rows as unknown as IDataObject[]);
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
		const response = await tablesDB.listRows({
			databaseId,
			tableId,
			queries: finalQueries,
			transactionId,
		});
		return toItems(response.rows as unknown as IDataObject[]);
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
		return toItems(response as unknown as IDataObject);
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
		return toItems(response.rows as unknown as IDataObject[]);
	}

	if (operation === 'upsert') {
		const rowId = resolveRowId(this.getNodeParameter('rowId', i, '') as string);
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
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'upsertMany') {
		const rows = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('rowsJson', i),
			'rowsJson',
			i,
		) as object[];
		const response = await tablesDB.upsertRows({ databaseId, tableId, rows, transactionId });
		return toItems(response.rows as unknown as IDataObject[]);
	}

	if (operation === 'delete') {
		const rowId = this.getNodeParameter('rowId', i) as string;
		await tablesDB.deleteRow({ databaseId, tableId, rowId, transactionId });
		return toItems({ success: true, rowId });
	}

	if (operation === 'deleteMany') {
		const queries = buildQueries.call(this, i);
		const response = await tablesDB.deleteRows({
			databaseId,
			tableId,
			queries: queries.length > 0 ? queries : undefined,
			transactionId,
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'increment') {
		const rowId = this.getNodeParameter('rowId', i) as string;
		const column = this.getNodeParameter('column', i) as string;
		const value = this.getNodeParameter('value', i, 1) as number;
		const response = await tablesDB.incrementRowColumn({
			databaseId,
			tableId,
			rowId,
			column,
			value,
			max: options.max,
			transactionId,
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'decrement') {
		const rowId = this.getNodeParameter('rowId', i) as string;
		const column = this.getNodeParameter('column', i) as string;
		const value = this.getNodeParameter('value', i, 1) as number;
		const response = await tablesDB.decrementRowColumn({
			databaseId,
			tableId,
			rowId,
			column,
			value,
			min: options.min,
			transactionId,
		});
		return toItems(response as unknown as IDataObject);
	}

	throw new NodeOperationError(this.getNode(), `Unknown row operation "${operation}"`, {
		itemIndex: i,
	});
}
