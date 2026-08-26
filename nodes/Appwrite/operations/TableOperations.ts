import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeTableOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = extractId(this.getNodeParameter('databaseId', i) as string, 'database');
	const tablesPath = `/tablesdb/${encodeURIComponent(databaseId)}/tables`;

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
		return toItems(response, i);
	}

	if (operation === 'get') {
		const tableId = extractId(this.getNodeParameter('tableId', i) as string, 'table');
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${tablesPath}/${encodeURIComponent(tableId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const tables = await fetchAllPages.call(
				this,
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
			return toItems(tables as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			tablesPath,
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(response.tables as IDataObject[], i);
	}

	if (operation === 'update') {
		const tableId = extractId(this.getNodeParameter('tableId', i) as string, 'table');
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const updateFields = this.getNodeParameter('updateFields', i, {}) as {
			enabled?: boolean;
			rowSecurity?: boolean;
		};
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`${tablesPath}/${encodeURIComponent(tableId)}`,
			{
				body: {
					name,
					permissions,
					rowSecurity: updateFields.rowSecurity,
					enabled: updateFields.enabled,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const tableId = extractId(this.getNodeParameter('tableId', i) as string, 'table');
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${tablesPath}/${encodeURIComponent(tableId)}`,
			{},
			i,
		);
		return toItems({ success: true, databaseId, tableId }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown table operation "${operation}"`, {
		itemIndex: i,
	});
}
