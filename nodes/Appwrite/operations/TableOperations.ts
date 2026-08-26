import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildQueries, fetchAllPages, getPermissions } from '../GenericFunctions';
import { Query, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeTableOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = this.getNodeParameter('databaseId', i) as string;
	const tablesPath = `/tablesdb/${encodeURIComponent(databaseId)}/tables`;

	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	if (operation === 'create') {
		const tableId = resolveId(this.getNodeParameter('tableId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const rowSecurity = this.getNodeParameter('rowSecurity', i, false) as boolean;
		const enabled = this.getNodeParameter('enabled', i, true) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			tablesPath,
			{ body: { tableId, name, permissions, rowSecurity, enabled } },
			i,
		);
		return toItems(response);
	}

	if (operation === 'get') {
		const tableId = this.getNodeParameter('tableId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${tablesPath}/${encodeURIComponent(tableId)}`,
			{},
			i,
		);
		return toItems(response);
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
					await appwriteApiRequest.call(
						this,
						'GET',
						tablesPath,
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'tables',
			);
			return toItems(tables as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			tablesPath,
			{ qs: { queries: [...queries, Query.limit(limit)], search: searchArg } },
			i,
		);
		return toItems(response.tables as IDataObject[]);
	}

	if (operation === 'update') {
		const tableId = this.getNodeParameter('tableId', i) as string;
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const rowSecurity = this.getNodeParameter('rowSecurity', i, false) as boolean;
		const enabled = this.getNodeParameter('enabled', i, true) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`${tablesPath}/${encodeURIComponent(tableId)}`,
			{ body: { name, permissions, rowSecurity, enabled } },
			i,
		);
		return toItems(response);
	}

	if (operation === 'delete') {
		const tableId = this.getNodeParameter('tableId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${tablesPath}/${encodeURIComponent(tableId)}`,
			{},
			i,
		);
		return toItems({ success: true, databaseId, tableId });
	}

	throw new NodeOperationError(this.getNode(), `Unknown table operation "${operation}"`, {
		itemIndex: i,
	});
}
