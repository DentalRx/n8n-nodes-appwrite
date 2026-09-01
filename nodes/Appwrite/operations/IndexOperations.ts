import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	lookupEnum,
	parseStringList,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { extractId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** The index types Appwrite accepts, keyed by the value the UI stores. */
const INDEX_TYPE_MAP: Record<string, string> = {
	key: 'key',
	fulltext: 'fulltext',
	unique: 'unique',
	spatial: 'spatial',
};

export async function executeIndexOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = extractId(this.getNodeParameter('databaseId', i) as string, 'database');
	const tableId = extractId(this.getNodeParameter('tableId', i) as string, 'table');
	const indexesPath = `/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(
		tableId,
	)}/indexes`;

	if (operation === 'create') {
		const key = this.getNodeParameter('key', i) as string;
		const typeRaw = this.getNodeParameter('indexType', i) as string;
		const options = this.getNodeParameter('options', i, {}) as {
			lengths?: string;
			orders?: string;
		};
		const columns = parseStringList.call(
			this,
			this.getNodeParameter('columns', i, '') as string,
			'Columns',
			i,
		);
		const orders = parseStringList.call(this, options.orders ?? '', 'Orders', i).map((order) => {
			const normalized = order.toLowerCase();
			if (normalized !== 'asc' && normalized !== 'desc') {
				throw new NodeOperationError(this.getNode(), `Unknown sort order "${order}"`, {
					description: 'Expected one of: asc, desc.',
					itemIndex: i,
				});
			}
			return normalized;
		});
		const lengths = parseStringList.call(this, options.lengths ?? '', 'Lengths', i).map((value) => {
			const parsed = Number(value);
			if (Number.isNaN(parsed)) {
				throw new NodeOperationError(this.getNode(), "Parameter 'Lengths' must contain numbers", {
					itemIndex: i,
				});
			}
			return parsed;
		});

		const response = await appwriteApiRequest.call(
			this,
			'POST',
			indexesPath,
			{
				body: {
					key,
					type: lookupEnum(this, INDEX_TYPE_MAP, typeRaw, 'index type', i),
					columns,
					orders: orders.length > 0 ? orders : undefined,
					lengths: lengths.length > 0 ? lengths : undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'get') {
		const key = this.getNodeParameter('key', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${indexesPath}/${encodeURIComponent(key)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const indexes = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						indexesPath,
						{ qs: { queries: pageQueries } },
						i,
					),
				'indexes',
				i,
			);
			return toItems(indexes as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			indexesPath,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.indexes as IDataObject[], i);
	}

	if (operation === 'delete') {
		const key = this.getNodeParameter('key', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${indexesPath}/${encodeURIComponent(key)}`,
			{},
			i,
		);
		return toItems({ deleted: true, databaseId, tableId, key }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown index operation "${operation}"`, {
		itemIndex: i,
	});
}
