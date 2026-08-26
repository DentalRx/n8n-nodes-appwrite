import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildQueries, fetchAllPages, toItems, withLimit } from '../GenericFunctions';
import { extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeDatabaseOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'create') {
		const databaseId = resolveId(this.getNodeParameter('databaseId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		const enabled = this.getNodeParameter('enabled', i, true) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/tablesdb',
			{ body: { databaseId, name, enabled } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'get') {
		const databaseId = extractId(this.getNodeParameter('databaseId', i) as string, 'database');
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/tablesdb/${encodeURIComponent(databaseId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const databases = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/tablesdb',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'databases',
			);
			return toItems(databases as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/tablesdb',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(response.databases as IDataObject[], i);
	}

	if (operation === 'update') {
		const databaseId = extractId(this.getNodeParameter('databaseId', i) as string, 'database');
		const name = this.getNodeParameter('name', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as { enabled?: boolean };
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`/tablesdb/${encodeURIComponent(databaseId)}`,
			{ body: { name, enabled: updateFields.enabled } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const databaseId = extractId(this.getNodeParameter('databaseId', i) as string, 'database');
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/tablesdb/${encodeURIComponent(databaseId)}`,
			{},
			i,
		);
		return toItems({ success: true, databaseId }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown database operation "${operation}"`, {
		itemIndex: i,
	});
}
