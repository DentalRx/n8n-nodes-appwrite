import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ID, Query, type Messaging } from 'node-appwrite';

import { buildQueries, fetchAllPages, parseJsonArrayParameter } from '../GenericFunctions';

export async function executeTopicOperation(
	this: IExecuteFunctions,
	messaging: Messaging,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	const parseList = (raw: string, name: string): string[] => {
		if (raw.trim() === '') return [];
		if (raw.trim().startsWith('[')) {
			return parseJsonArrayParameter.call(this, raw, name, i).map((e) => String(e));
		}
		return raw
			.split(',')
			.map((e) => e.trim())
			.filter((e) => e !== '');
	};

	const listOrUndefined = (raw: string | undefined, name: string): string[] | undefined => {
		const list = parseList(raw ?? '', name);
		return list.length > 0 ? list : undefined;
	};

	const resolveId = (rawId: string): string =>
		rawId === '' || rawId === 'unique()' ? ID.unique() : rawId;

	if (operation === 'create') {
		const topicId = resolveId(this.getNodeParameter('topicId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		const subscribe = listOrUndefined(
			this.getNodeParameter('subscribe', i, '') as string,
			'subscribe',
		);
		const response = await messaging.createTopic({ topicId, name, subscribe });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'createSubscriber') {
		const topicId = this.getNodeParameter('topicId', i) as string;
		const subscriberId = resolveId(this.getNodeParameter('subscriberId', i, '') as string);
		const targetId = this.getNodeParameter('targetId', i) as string;
		const response = await messaging.createSubscriber({ topicId, subscriberId, targetId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'delete') {
		const topicId = this.getNodeParameter('topicId', i) as string;
		await messaging.deleteTopic({ topicId });
		return toItems({ success: true, topicId });
	}

	if (operation === 'deleteSubscriber') {
		const topicId = this.getNodeParameter('topicId', i) as string;
		const subscriberId = this.getNodeParameter('subscriberId', i) as string;
		await messaging.deleteSubscriber({ topicId, subscriberId });
		return toItems({ success: true, topicId, subscriberId });
	}

	if (operation === 'get') {
		const topicId = this.getNodeParameter('topicId', i) as string;
		const response = await messaging.getTopic({ topicId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const topics = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await messaging.listTopics({
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'topics',
			);
			return toItems(topics as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await messaging.listTopics({
			queries: [...queries, Query.limit(limit)],
			search: searchArg,
		});
		return toItems(response.topics as unknown as IDataObject[]);
	}

	if (operation === 'getManySubscribers') {
		const topicId = this.getNodeParameter('topicId', i) as string;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const subscribers = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await messaging.listSubscribers({
						topicId,
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'subscribers',
			);
			return toItems(subscribers as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await messaging.listSubscribers({
			topicId,
			queries: [...queries, Query.limit(limit)],
			search: searchArg,
		});
		return toItems(response.subscribers as unknown as IDataObject[]);
	}

	if (operation === 'getSubscriber') {
		const topicId = this.getNodeParameter('topicId', i) as string;
		const subscriberId = this.getNodeParameter('subscriberId', i) as string;
		const response = await messaging.getSubscriber({ topicId, subscriberId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'update') {
		const topicId = this.getNodeParameter('topicId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as {
			name?: string;
			subscribe?: string;
		};
		const response = await messaging.updateTopic({
			topicId,
			name: updateFields.name || undefined,
			subscribe: listOrUndefined(updateFields.subscribe, 'subscribe'),
		});
		return toItems(response as unknown as IDataObject);
	}

	throw new NodeOperationError(this.getNode(), `Unknown topic operation "${operation}"`, {
		itemIndex: i,
	});
}
