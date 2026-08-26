import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Query, type TablesDB } from 'node-appwrite';

import { buildQueries, fetchAllPages, parseJsonArrayParameter } from '../GenericFunctions';

export async function executeTransactionOperation(
	this: IExecuteFunctions,
	tablesDB: TablesDB,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	if (operation === 'create') {
		const ttl = this.getNodeParameter('ttl', i, 300) as number;
		const response = await tablesDB.createTransaction({ ttl });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'get') {
		const transactionId = this.getNodeParameter('transactionId', i) as string;
		const response = await tablesDB.getTransaction({ transactionId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const transactions = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await tablesDB.listTransactions({ queries: pageQueries })) as unknown as IDataObject,
				'transactions',
			);
			return toItems(transactions as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await tablesDB.listTransactions({
			queries: [...queries, Query.limit(limit)],
		});
		return toItems(response.transactions as unknown as IDataObject[]);
	}

	if (operation === 'commit' || operation === 'rollback') {
		const transactionId = this.getNodeParameter('transactionId', i) as string;
		const response = await tablesDB.updateTransaction({
			transactionId,
			commit: operation === 'commit' ? true : undefined,
			rollback: operation === 'rollback' ? true : undefined,
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'createOperations') {
		const transactionId = this.getNodeParameter('transactionId', i) as string;
		const operations = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('operationsJson', i),
			'operationsJson',
			i,
		) as object[];
		const response = await tablesDB.createOperations({ transactionId, operations });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'delete') {
		const transactionId = this.getNodeParameter('transactionId', i) as string;
		await tablesDB.deleteTransaction({ transactionId });
		return toItems({ success: true, transactionId });
	}

	throw new NodeOperationError(this.getNode(), `Unknown transaction operation "${operation}"`, {
		itemIndex: i,
	});
}
