import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getPermissions,
	getResourceId,
	getStringParameter,
	parseJsonParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

interface PresenceOptions {
	expiresAt?: string;
	metadata?: unknown;
	purge?: boolean;
	status?: unknown;
}

export async function executePresenceOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'upsert' || operation === 'update') {
		// With an API key Appwrite needs to be told whose presence this is.
		const userId = getResourceId.call(this, 'userId', i, 'user', 'User');
		const options = getCollectionParameter.call(this, 'presenceOptions', i) as PresenceOptions;
		const metadata =
			options.metadata === undefined
				? undefined
				: parseJsonParameter.call(this, options.metadata, 'Metadata', i);
		const common: IDataObject = {
			userId,
			permissions: getPermissions.call(this, i),
			expiresAt: options.expiresAt || undefined,
			metadata,
		};

		if (operation === 'upsert') {
			const presenceId = resolveId(this.getNodeParameter('presenceId', i, ''));
			const status = String(this.getNodeParameter('presenceStatus', i) ?? '');
			const response = await appwriteApiRequest.call(
				this,
				'PUT',
				`/presences/${encodeURIComponent(presenceId)}`,
				{ body: { ...common, status } },
				i,
			);
			return toItems(response, i);
		}

		const presenceId = String(this.getNodeParameter('presenceId', i) ?? '');
		const status =
			options.status === undefined || options.status === '' ? undefined : String(options.status);
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/presences/${encodeURIComponent(presenceId)}`,
			{ body: { ...common, status, purge: options.purge || undefined } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const presenceId = getStringParameter.call(this, 'presenceId', i);
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
		const presenceId = getStringParameter.call(this, 'presenceId', i);
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
