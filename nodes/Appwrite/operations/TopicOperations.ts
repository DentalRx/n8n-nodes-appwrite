import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	parseStringList,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeTopicOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const listOrUndefined = (raw: string | undefined, name: string): string[] | undefined => {
		const list = parseStringList.call(this, raw ?? '', name, i);
		return list.length > 0 ? list : undefined;
	};

	const topicPath = (): string =>
		`/messaging/topics/${encodeURIComponent(extractId(this.getNodeParameter('topicId', i) as string, 'topic'))}`;

	if (operation === 'create') {
		const topicId = resolveId(this.getNodeParameter('topicId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		const subscribe = listOrUndefined(
			this.getNodeParameter('subscribe', i, '') as string,
			'Subscribe Roles',
		);
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/messaging/topics',
			{ body: { topicId, name, subscribe } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createSubscriber') {
		const path = `${topicPath()}/subscribers`;
		const subscriberId = resolveId(this.getNodeParameter('subscriberId', i, '') as string);
		const targetId = this.getNodeParameter('targetId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			path,
			{ body: { subscriberId, targetId } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const topicId = extractId(this.getNodeParameter('topicId', i) as string, 'topic');
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/messaging/topics/${encodeURIComponent(topicId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, topicId }, i);
	}

	if (operation === 'deleteSubscriber') {
		const topicId = extractId(this.getNodeParameter('topicId', i) as string, 'topic');
		const subscriberId = this.getNodeParameter('subscriberId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/messaging/topics/${encodeURIComponent(topicId)}/subscribers/${encodeURIComponent(
				subscriberId,
			)}`,
			{},
			i,
		);
		return toItems({ deleted: true, topicId, subscriberId }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', topicPath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const topics = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/messaging/topics',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'topics',
				i,
			);
			return toItems(topics as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/messaging/topics',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(response.topics as IDataObject[], i);
	}

	if (operation === 'getManySubscribers') {
		const path = `${topicPath()}/subscribers`;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const subscribers = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						path,
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'subscribers',
				i,
			);
			return toItems(subscribers as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			path,
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(response.subscribers as IDataObject[], i);
	}

	if (operation === 'getSubscriber') {
		const subscriberId = this.getNodeParameter('subscriberId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${topicPath()}/subscribers/${encodeURIComponent(subscriberId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'update') {
		const path = topicPath();
		const updateFields = this.getNodeParameter('updateFields', i, {}) as {
			name?: string;
			subscribe?: string;
		};
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			path,
			{
				body: {
					name: updateFields.name || undefined,
					subscribe: listOrUndefined(updateFields.subscribe, 'Subscribe Roles'),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown topic operation "${operation}"`, {
		itemIndex: i,
	});
}
