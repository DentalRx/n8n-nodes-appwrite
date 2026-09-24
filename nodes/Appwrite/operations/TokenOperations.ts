import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getResourceId,
	getStringParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

export async function executeTokenOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	/** Tokens are scoped to a file: /tokens/buckets/{bucketId}/files/{fileId} */
	const filePath = (): string => {
		const bucketId = getResourceId.call(this, 'bucketId', i, 'bucket', 'Bucket');
		const fileId = getResourceId.call(this, 'fileId', i, 'file', 'File');
		return `/tokens/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}`;
	};

	if (operation === 'create') {
		const expire = getStringParameter.call(this, 'expire', i, '');
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			filePath(),
			{ body: { expire: expire === '' ? undefined : expire } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'get') {
		const tokenId = getStringParameter.call(this, 'tokenId', i);
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/tokens/${encodeURIComponent(tokenId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const path = filePath();
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const results = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(this, 'GET', path, { qs: { queries: pageQueries } }, i),
				'tokens',
				i,
			);
			return toItems(results as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			path,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.tokens as IDataObject[], i);
	}

	if (operation === 'update') {
		const tokenId = getStringParameter.call(this, 'tokenId', i);
		const expire = getStringParameter.call(this, 'expire', i, '');
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/tokens/${encodeURIComponent(tokenId)}`,
			{ body: { expire: expire === '' ? undefined : expire } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const tokenId = getStringParameter.call(this, 'tokenId', i);
		await appwriteApiRequest.call(this, 'DELETE', `/tokens/${encodeURIComponent(tokenId)}`, {}, i);
		return toItems({ deleted: true, tokenId }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown token operation "${operation}"`, {
		itemIndex: i,
	});
}
