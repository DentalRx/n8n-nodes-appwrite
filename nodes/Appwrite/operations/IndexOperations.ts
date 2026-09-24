import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getResourceId,
	getStringParameter,
	lookupEnum,
	parseStringList,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

/** The index types Appwrite accepts, keyed by the value the UI stores. */
const INDEX_TYPE_MAP: Record<string, string> = {
	key: 'key',
	fulltext: 'fulltext',
	unique: 'unique',
	spatial: 'spatial',
};

/**
 * Read an index's optional Orders and Lengths (the `options` collection of a
 * create-index operation), each matched position by position against the
 * indexed columns or attributes. Empty lists come back undefined, so they are
 * left out of the request.
 */
export function getIndexOrdersAndLengths(
	this: IExecuteFunctions,
	i: number,
): { orders?: string[]; lengths?: number[] } {
	const options = getCollectionParameter.call(this, 'options', i) as {
		lengths?: string;
		orders?: string;
	};
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
	return {
		orders: orders.length > 0 ? orders : undefined,
		lengths: lengths.length > 0 ? lengths : undefined,
	};
}

export async function executeIndexOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = getResourceId.call(this, 'databaseId', i, 'database', 'Database');
	const tableId = getResourceId.call(this, 'tableId', i, 'table', 'Table');
	const indexesPath = `/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(
		tableId,
	)}/indexes`;

	if (operation === 'create') {
		const key = getStringParameter.call(this, 'key', i);
		const typeRaw = getStringParameter.call(this, 'indexType', i);
		const columns = parseStringList.call(
			this,
			getStringParameter.call(this, 'columns', i, ''),
			'Columns',
			i,
		);
		const { orders, lengths } = getIndexOrdersAndLengths.call(this, i);

		const response = await appwriteApiRequest.call(
			this,
			'POST',
			indexesPath,
			{
				body: {
					key,
					type: lookupEnum(this, INDEX_TYPE_MAP, typeRaw, 'index type', i),
					columns,
					orders,
					lengths,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'get') {
		const key = getStringParameter.call(this, 'key', i);
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
		const key = getStringParameter.call(this, 'key', i);
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
