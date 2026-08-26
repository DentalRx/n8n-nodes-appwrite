import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { IndexType, type TablesDB } from 'node-appwrite';

import {
	buildQueries,
	fetchAllPages,
	getStringListParameter,
	lookupEnum,
	toItems,
	withLimit,
} from '../GenericFunctions';

const INDEX_TYPE_MAP: Record<string, IndexType> = {
	key: IndexType.Key,
	fulltext: IndexType.Fulltext,
	unique: IndexType.Unique,
	spatial: IndexType.Spatial,
};

export async function executeIndexOperation(
	this: IExecuteFunctions,
	tablesDB: TablesDB,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = this.getNodeParameter('databaseId', i) as string;
	const tableId = this.getNodeParameter('tableId', i) as string;

	if (operation === 'create') {
		const key = this.getNodeParameter('key', i) as string;
		const typeRaw = this.getNodeParameter('indexType', i) as string;
		const columns = getStringListParameter.call(this, 'columns', i);
		const orders = getStringListParameter.call(this, 'orders', i);
		const lengths = getStringListParameter.call(this, 'lengths', i).map((value) => {
			const parsed = Number(value);
			if (Number.isNaN(parsed)) {
				throw new NodeOperationError(this.getNode(), 'Parameter "Lengths" must contain numbers', {
					itemIndex: i,
				});
			}
			return parsed;
		});

		const response = await tablesDB.createIndex({
			databaseId,
			tableId,
			key,
			type: lookupEnum(this, INDEX_TYPE_MAP, typeRaw, 'index type', i),
			columns,
			orders: orders.length > 0 ? orders : undefined,
			lengths: lengths.length > 0 ? lengths : undefined,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'get') {
		const key = this.getNodeParameter('key', i) as string;
		const response = await tablesDB.getIndex({ databaseId, tableId, key });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const indexes = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await tablesDB.listIndexes({
						databaseId,
						tableId,
						queries: pageQueries,
					})) as unknown as IDataObject,
				'indexes',
			);
			return toItems(indexes as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await tablesDB.listIndexes({
			databaseId,
			tableId,
			queries: withLimit(queries, limit),
		});
		return toItems(response.indexes as unknown as IDataObject[], i);
	}

	if (operation === 'delete') {
		const key = this.getNodeParameter('key', i) as string;
		await tablesDB.deleteIndex({ databaseId, tableId, key });
		return toItems({ success: true, databaseId, tableId, key }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown index operation "${operation}"`, {
		itemIndex: i,
	});
}
