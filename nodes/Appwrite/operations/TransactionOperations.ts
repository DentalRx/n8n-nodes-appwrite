import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	parseJsonArrayParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

export async function executeTransactionOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'create') {
		const ttl = this.getNodeParameter('ttl', i, 300) as number;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/tablesdb/transactions',
			{ body: { ttl } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'get') {
		const transactionId = this.getNodeParameter('transactionId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/tablesdb/transactions/${encodeURIComponent(transactionId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const transactions = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/tablesdb/transactions',
						{ qs: { queries: pageQueries } },
						i,
					),
				'transactions',
				i,
			);
			return toItems(transactions as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/tablesdb/transactions',
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.transactions as IDataObject[], i);
	}

	if (operation === 'commit' || operation === 'rollback') {
		const transactionId = this.getNodeParameter('transactionId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/tablesdb/transactions/${encodeURIComponent(transactionId)}`,
			{
				body: {
					commit: operation === 'commit' ? true : undefined,
					rollback: operation === 'rollback' ? true : undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createOperations') {
		const transactionId = this.getNodeParameter('transactionId', i) as string;
		const operations = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('operationsJson', i),
			'Operations (JSON)',
			i,
		) as object[];
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`/tablesdb/transactions/${encodeURIComponent(transactionId)}/operations`,
			{ body: { operations } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const transactionId = this.getNodeParameter('transactionId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/tablesdb/transactions/${encodeURIComponent(transactionId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, transactionId }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown transaction operation "${operation}"`, {
		itemIndex: i,
	});
}
