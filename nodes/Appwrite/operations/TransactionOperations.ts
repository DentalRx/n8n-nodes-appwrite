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

/**
 * What can be done with a transaction. TablesDB, DocumentsDB and VectorsDB
 * each serve the same transactions API under their own base path.
 */
export type TransactionAction =
	'commit' | 'create' | 'createOperations' | 'delete' | 'get' | 'getMany' | 'rollback';

const TRANSACTION_ACTIONS: readonly string[] = [
	'commit',
	'create',
	'createOperations',
	'delete',
	'get',
	'getMany',
	'rollback',
] satisfies TransactionAction[];

/**
 * Run a transaction action against the transactions API of one database type,
 * e.g. `/tablesdb` or `/documentsdb`.
 */
export async function executeTransactionAction(
	this: IExecuteFunctions,
	apiPath: string,
	action: TransactionAction,
	i: number,
): Promise<INodeExecutionData[]> {
	const transactionsPath = `${apiPath}/transactions`;
	const transactionPath = (): string =>
		`${transactionsPath}/${encodeURIComponent(this.getNodeParameter('transactionId', i) as string)}`;

	if (action === 'create') {
		const ttl = this.getNodeParameter('ttl', i, 300) as number;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			transactionsPath,
			{ body: { ttl } },
			i,
		);
		return toItems(response, i);
	}

	if (action === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', transactionPath(), {}, i);
		return toItems(response, i);
	}

	if (action === 'getMany') {
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
						transactionsPath,
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
			transactionsPath,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.transactions as IDataObject[], i);
	}

	if (action === 'commit' || action === 'rollback') {
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			transactionPath(),
			{
				body: {
					commit: action === 'commit' ? true : undefined,
					rollback: action === 'rollback' ? true : undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (action === 'createOperations') {
		const path = `${transactionPath()}/operations`;
		const operations = parseJsonArrayParameter.call(
			this,
			this.getNodeParameter('operationsJson', i),
			'Operations (JSON)',
			i,
		) as object[];
		const response = await appwriteApiRequest.call(this, 'POST', path, { body: { operations } }, i);
		return toItems(response, i);
	}

	// The one action left is 'delete'.
	const transactionId = this.getNodeParameter('transactionId', i) as string;
	await appwriteApiRequest.call(
		this,
		'DELETE',
		`${transactionsPath}/${encodeURIComponent(transactionId)}`,
		{},
		i,
	);
	return toItems({ deleted: true, transactionId }, i);
}

export async function executeTransactionOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (TRANSACTION_ACTIONS.includes(operation)) {
		return await executeTransactionAction.call(
			this,
			'/tablesdb',
			operation as TransactionAction,
			i,
		);
	}

	throw new NodeOperationError(this.getNode(), `Unknown transaction operation "${operation}"`, {
		itemIndex: i,
	});
}
