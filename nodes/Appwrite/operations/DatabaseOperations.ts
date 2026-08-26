import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { type TablesDB } from 'node-appwrite';

import { buildQueries, fetchAllPages, resolveId, toItems, withLimit } from '../GenericFunctions';

export async function executeDatabaseOperation(
	this: IExecuteFunctions,
	tablesDB: TablesDB,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'create') {
		const rawId = this.getNodeParameter('databaseId', i, '') as string;
		const databaseId = resolveId(rawId);
		const name = this.getNodeParameter('name', i) as string;
		const enabled = this.getNodeParameter('enabled', i, true) as boolean;
		const response = await tablesDB.create({ databaseId, name, enabled });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'get') {
		const databaseId = this.getNodeParameter('databaseId', i) as string;
		const response = await tablesDB.get({ databaseId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const databases = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await tablesDB.list({
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'databases',
			);
			return toItems(databases as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await tablesDB.list({
			queries: withLimit(queries, limit),
			search: searchArg,
		});
		return toItems(response.databases as unknown as IDataObject[], i);
	}

	if (operation === 'update') {
		const databaseId = this.getNodeParameter('databaseId', i) as string;
		const name = this.getNodeParameter('name', i) as string;
		const enabled = this.getNodeParameter('enabled', i, true) as boolean;
		const response = await tablesDB.update({ databaseId, name, enabled });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'delete') {
		const databaseId = this.getNodeParameter('databaseId', i) as string;
		await tablesDB.delete({ databaseId });
		return toItems({ success: true, databaseId }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown database operation "${operation}"`, {
		itemIndex: i,
	});
}
