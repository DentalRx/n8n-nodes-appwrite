import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildQueries, fetchAllPages, parseJsonArrayParameter } from '../GenericFunctions';
import { Query, extractId } from '../helpers/appwrite';
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

		const response = await appwriteApiRequest.call(
			this,
			'POST',
			indexesPath,
			{
				body: {
					key,
					type: INDEX_TYPE_MAP[typeRaw],
					columns,
					orders: orders.length > 0 ? orders : undefined,
					lengths: lengths.length > 0 ? lengths : undefined,
				},
			},
			i,
		);
		return toItems(response);
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
		return toItems(response);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const indexes = await fetchAllPages(
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
			);
			return toItems(indexes as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			indexesPath,
			{ qs: { queries: [...queries, Query.limit(limit)] } },
			i,
		);
		return toItems(response.indexes as IDataObject[]);
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
		return toItems({ success: true, databaseId, tableId, key });
	}

	throw new NodeOperationError(this.getNode(), `Unknown index operation "${operation}"`, {
		itemIndex: i,
	});
}
