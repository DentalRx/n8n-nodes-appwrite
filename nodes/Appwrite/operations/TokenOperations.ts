import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { type Tokens } from 'node-appwrite';

import { buildQueries, fetchAllPages, toItems, withLimit } from '../GenericFunctions';

export async function executeTokenOperation(
	this: IExecuteFunctions,
	tokens: Tokens,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'create') {
		const bucketId = this.getNodeParameter('bucketId', i) as string;
		const fileId = this.getNodeParameter('fileId', i) as string;
		const expire = this.getNodeParameter('expiresAt', i, '') as string;
		const response = await tokens.createFileToken({
			bucketId,
			fileId,
			expire: expire === '' ? undefined : expire,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'get') {
		const tokenId = this.getNodeParameter('tokenId', i) as string;
		const response = await tokens.get({ tokenId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getMany') {
		const bucketId = this.getNodeParameter('bucketId', i) as string;
		const fileId = this.getNodeParameter('fileId', i) as string;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const results = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await tokens.list({
						bucketId,
						fileId,
						queries: pageQueries,
					})) as unknown as IDataObject,
				'tokens',
			);
			return toItems(results as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await tokens.list({
			bucketId,
			fileId,
			queries: withLimit(queries, limit),
		});
		return toItems(response.tokens as unknown as IDataObject[], i);
	}

	if (operation === 'update') {
		const tokenId = this.getNodeParameter('tokenId', i) as string;
		const expire = this.getNodeParameter('expiresAt', i, '') as string;
		const response = await tokens.update({
			tokenId,
			expire: expire === '' ? undefined : expire,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'delete') {
		const tokenId = this.getNodeParameter('tokenId', i) as string;
		await tokens.delete({ tokenId });
		return toItems({ success: true, tokenId }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown token operation "${operation}"`, {
		itemIndex: i,
	});
}
