import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getResourceId,
	getStringListParameter,
	parseStringList,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

export async function executeApiKeyOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Resolved on first use: creating a key and listing keys act on no existing key.
	const keyId = (): string => getResourceId.call(this, 'apiKeyId', i, 'key', 'API Key');

	if (operation === 'createEphemeral') {
		const scopes = getStringListParameter.call(this, 'keyScopes', i, 'Scopes');
		if (scopes.length === 0) {
			throw new NodeOperationError(this.getNode(), "The 'Scopes' parameter is empty", {
				description: 'Enter at least one scope for the key to grant, such as users.read.',
				itemIndex: i,
			});
		}
		const duration = this.getNodeParameter('keyDuration', i) as number;
		// The response carries the key's secret: handing it to the next node is
		// what this operation is for.
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/project/keys/ephemeral',
			{ body: { scopes, duration } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const apiKeyId = keyId();
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/project/keys/${encodeURIComponent(apiKeyId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, apiKeyId }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/project/keys/${encodeURIComponent(keyId())}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const keys = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/project/keys',
						{ qs: { queries: pageQueries } },
						i,
					),
				'keys',
				i,
			);
			return toItems(keys as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/project/keys',
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.keys as IDataObject[], i);
	}

	if (operation === 'update') {
		const path = `/project/keys/${encodeURIComponent(keyId())}`;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as {
			expire?: string;
			keyScopes?: string;
			name?: string;
		};
		// PUT replaces the name, the scopes and the expiration date together, and
		// a missing expiration date means "never expires": read the key first and
		// resend whatever the user did not change.
		const current = await appwriteApiRequest.call(this, 'GET', path, {}, i);
		const expire =
			updateFields.expire === undefined
				? (current.expire as string | undefined)
				: updateFields.expire;
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			path,
			{
				body: {
					name: updateFields.name ?? current.name,
					scopes:
						updateFields.keyScopes === undefined
							? ((current.scopes as string[] | undefined) ?? [])
							: parseStringList.call(this, updateFields.keyScopes, 'Scopes', i),
					// Appwrite reads null, not an empty date, as "never expires".
					expire: expire || null,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown API key operation "${operation}"`, {
		itemIndex: i,
	});
}
