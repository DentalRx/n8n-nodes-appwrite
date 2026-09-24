import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildQueries, fetchAllPages, toItems, withLimit } from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

export async function executePresenceOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'delete') {
		const presenceId = this.getNodeParameter('presenceId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/presences/${encodeURIComponent(presenceId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, presenceId }, i);
	}

	if (operation === 'get') {
		const presenceId = this.getNodeParameter('presenceId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/presences/${encodeURIComponent(presenceId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const presences = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/presences',
						{ qs: { queries: pageQueries } },
						i,
					),
				'presences',
				i,
			);
			return toItems(presences as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/presences',
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.presences as IDataObject[], i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown presence operation "${operation}"`, {
		itemIndex: i,
	});
}
