import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildQueries, fetchAllPages } from '../GenericFunctions';
import { Query, extractId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeTokenOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	/** Tokens are scoped to a file: /tokens/buckets/{bucketId}/files/{fileId} */
	const filePath = (): string => {
		const bucketId = extractId(this.getNodeParameter('bucketId', i) as string, 'bucket');
		const fileId = extractId(this.getNodeParameter('fileId', i) as string, 'file');
		return `/tokens/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}`;
	};

	if (operation === 'create') {
		const expire = this.getNodeParameter('expire', i, '') as string;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			filePath(),
			{ body: { expire: expire === '' ? undefined : expire } },
			i,
		);
		return toItems(response);
	}

	if (operation === 'get') {
		const tokenId = this.getNodeParameter('tokenId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/tokens/${encodeURIComponent(tokenId)}`,
			{},
			i,
		);
		return toItems(response);
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
			);
			return toItems(results as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			path,
			{ qs: { queries: [...queries, Query.limit(limit)] } },
			i,
		);
		return toItems(response.tokens as IDataObject[]);
	}

	if (operation === 'update') {
		const tokenId = this.getNodeParameter('tokenId', i) as string;
		const expire = this.getNodeParameter('expire', i, '') as string;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/tokens/${encodeURIComponent(tokenId)}`,
			{ body: { expire: expire === '' ? undefined : expire } },
			i,
		);
		return toItems(response);
	}

	if (operation === 'delete') {
		const tokenId = this.getNodeParameter('tokenId', i) as string;
		await appwriteApiRequest.call(this, 'DELETE', `/tokens/${encodeURIComponent(tokenId)}`, {}, i);
		return toItems({ success: true, tokenId });
	}

	throw new NodeOperationError(this.getNode(), `Unknown token operation "${operation}"`, {
		itemIndex: i,
	});
}
