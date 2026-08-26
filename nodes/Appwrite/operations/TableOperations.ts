import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ID, Query, type TablesDB } from 'node-appwrite';

import { buildQueries, fetchAllPages, getPermissions } from '../GenericFunctions';

export async function executeTableOperation(
	this: IExecuteFunctions,
	tablesDB: TablesDB,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = this.getNodeParameter('databaseId', i) as string;

	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	if (operation === 'create') {
		const rawId = this.getNodeParameter('tableId', i, '') as string;
		const tableId = rawId === '' || rawId === 'unique()' ? ID.unique() : rawId;
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const rowSecurity = this.getNodeParameter('rowSecurity', i, false) as boolean;
		const enabled = this.getNodeParameter('enabled', i, true) as boolean;
		const response = await tablesDB.createTable({
			databaseId,
			tableId,
			name,
			permissions,
			rowSecurity,
			enabled,
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'get') {
		const tableId = this.getNodeParameter('tableId', i) as string;
		const response = await tablesDB.getTable({ databaseId, tableId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const tables = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await tablesDB.listTables({
						databaseId,
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'tables',
			);
			return toItems(tables as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await tablesDB.listTables({
			databaseId,
			queries: [...queries, Query.limit(limit)],
			search: searchArg,
		});
		return toItems(response.tables as unknown as IDataObject[]);
	}

	if (operation === 'update') {
		const tableId = this.getNodeParameter('tableId', i) as string;
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const rowSecurity = this.getNodeParameter('rowSecurity', i, false) as boolean;
		const enabled = this.getNodeParameter('enabled', i, true) as boolean;
		const response = await tablesDB.updateTable({
			databaseId,
			tableId,
			name,
			permissions,
			rowSecurity,
			enabled,
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'delete') {
		const tableId = this.getNodeParameter('tableId', i) as string;
		await tablesDB.deleteTable({ databaseId, tableId });
		return toItems({ success: true, databaseId, tableId });
	}

	throw new NodeOperationError(this.getNode(), `Unknown table operation "${operation}"`, {
		itemIndex: i,
	});
}
