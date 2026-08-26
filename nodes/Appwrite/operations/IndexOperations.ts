import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { IndexType, Query, type TablesDB } from 'node-appwrite';

import { buildQueries, fetchAllPages, parseJsonArrayParameter } from '../GenericFunctions';

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

	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	const parseList = (name: string): string[] => {
		const raw = this.getNodeParameter(name, i, '') as string;
		if (raw.trim() === '') return [];
		if (raw.trim().startsWith('[')) {
			return parseJsonArrayParameter.call(this, raw, name, i).map((e) => String(e));
		}
		return raw
			.split(',')
			.map((e) => e.trim())
			.filter((e) => e !== '');
	};

	if (operation === 'create') {
		const key = this.getNodeParameter('key', i) as string;
		const typeRaw = this.getNodeParameter('indexType', i) as string;
		const columns = parseList('columns');
		const orders = parseList('orders');
		const lengths = parseList('lengths').map((value) => {
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
			type: INDEX_TYPE_MAP[typeRaw],
			columns,
			orders: orders.length > 0 ? orders : undefined,
			lengths: lengths.length > 0 ? lengths : undefined,
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'get') {
		const key = this.getNodeParameter('key', i) as string;
		const response = await tablesDB.getIndex({ databaseId, tableId, key });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const indexes = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await tablesDB.listIndexes({
						databaseId,
						tableId,
						queries: pageQueries,
					})) as unknown as IDataObject,
				'indexes',
			);
			return toItems(indexes as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await tablesDB.listIndexes({
			databaseId,
			tableId,
			queries: [...queries, Query.limit(limit)],
		});
		return toItems(response.indexes as unknown as IDataObject[]);
	}

	if (operation === 'delete') {
		const key = this.getNodeParameter('key', i) as string;
		await tablesDB.deleteIndex({ databaseId, tableId, key });
		return toItems({ success: true, databaseId, tableId, key });
	}

	throw new NodeOperationError(this.getNode(), `Unknown index operation "${operation}"`, {
		itemIndex: i,
	});
}
